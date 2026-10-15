/**
 * Kiểm tra lớp vỏ của dashboard sản xuất (URL /production-dashboard).
 *
 * Chạy: node scripts/verify-dashboard-ui.mjs <url-gốc>
 *
 * Những thứ dễ hỏng âm thầm ở đây đều là thứ KHÔNG có test logic nào đụng tới —
 * chỉ lỗi về khung:
 *   - viền ngoài bảng: shadcn bọc <table> trong một lớp `overflow-x-auto` riêng,
 *     bảng rộng hơn khung thì viền phải trôi ra ngoài tầm nhìn và biến mất.
 *   - lưới 3 cột của header: cột trái dùng `fr` nuốt hết chỗ trống, thanh lệch
 *     sang trái so với bộ lọc ở giữa.
 *   - tooltip dải công đoạn: phải bám shadcn, không được rơi về `title` cũ.
 *   - chiều cao biểu đồ: bị bóp theo phần dư của bảng, thấp hơn cả tiêu đề.
 */

import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';
const url = `${base}/production-dashboard?line=DIP-1`;

const browser = await chromium.launch();
let failed = 0;

function report(label, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

const page = await browser.newPage();
// Màn hình TV của xưởng. Các kiểm tra bên dưới có phần cố tình thu nhỏ cửa sổ
// để ép bảng phải cuộn ngang rồi mới trả lại kích thước.
await page.setViewportSize({ width: 1400, height: 900 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Cascade công đoạn → chuyền → model → ngày → ca: link ?line= khôi phục sẵn
// công đoạn + chuyền, script chỉ cần chọn nốt ca thì data mới query.
await page.getByRole('combobox', { name: /ca làm việc|shift|班次/i }).click();
await page
  .getByRole('option', { name: /ca ngày|day shift|白班/i })
  .first()
  .click();
await page.waitForTimeout(1500);

/* -------------------------------------------------------------------------- */
/*  1. Viền ngoài của bảng công đoạn                                            */
/* -------------------------------------------------------------------------- */

/** Số px viền thực sự vẽ ra trên mỗi cạnh. `border-border` KHÔNG kéo theo độ dày. */
const cardBorders = await page.evaluate(() => {
  const card = document.querySelector('[data-slot=table-container]').closest('[data-slot=card]');
  const cs = getComputedStyle(card);
  return {
    top: parseFloat(cs.borderTopWidth),
    right: parseFloat(cs.borderRightWidth),
    bottom: parseFloat(cs.borderBottomWidth),
    left: parseFloat(cs.borderLeftWidth),
  };
});
report(
  'bảng: thẻ có đủ viền 1px ở cả bốn cạnh',
  Object.values(cardBorders).every((width) => width === 1),
  JSON.stringify(cardBorders)
);

// Lớp bọc mặc định của shadcn phải ngừng cuộn, nếu không viền phải của bảng rộng
// 1450px sẽ nằm ngoài khung và biến mất khi người dùng cuộn ngang.
const scrollLayers = await page.evaluate(() => {
  const container = document.querySelector('[data-slot=table-container]');
  const outer = container.parentElement;
  return {
    inner: getComputedStyle(container).overflowX,
    outer: getComputedStyle(outer).overflowX,
    outerClientWidth: outer.clientWidth,
    outerScrollWidth: outer.scrollWidth,
  };
});
report(
  'bảng: lớp bọc trong không tự cuộn (viền phải không trôi khỏi khung)',
  scrollLayers.inner === 'visible',
  `inner=${scrollLayers.inner}`
);
report(
  'bảng: lớp ngoài cuộn ngang được (bảng rộng hơn khung)',
  scrollLayers.outer === 'auto' && scrollLayers.outerScrollWidth > scrollLayers.outerClientWidth,
  `${scrollLayers.outerScrollWidth} > ${scrollLayers.outerClientWidth}`
);

// Cuộn sang cuối: viền phải của thẻ vẫn phải còn nguyên.
await page.evaluate(() => {
  const scroller = document.querySelector('[data-slot=table-container]').parentElement;
  scroller.scrollLeft = scroller.scrollWidth;
});
await page.waitForTimeout(300);
const afterScroll = await page.evaluate(() => {
  const card = document.querySelector('[data-slot=table-container]').closest('[data-slot=card]');
  const cs = getComputedStyle(card);
  return [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth];
});
report(
  'bảng: cuộn hết bên phải viền vẫn trọn',
  afterScroll.every((w) => parseFloat(w) === 1),
  afterScroll.join('|')
);

/* -------------------------------------------------------------------------- */
/*  2. Header chia đều ba cột                                                 */
/* -------------------------------------------------------------------------- */

await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(400);

const header = await page.evaluate(() => {
  const el = document.querySelector('header');
  const [brand, filters, meta] = el.children;
  const box = (node) => {
    const r = node.getBoundingClientRect();
    return { left: r.left, right: r.right };
  };
  return {
    brand: box(brand),
    filters: box(filters),
    meta: box(meta),
    // Cột trái phải ôm sát nội dung. Nếu nó là `fr` thì nó sẽ nuốt hết chỗ
    // trống dư: khối tiêu đề nằm sát mép tráo còn cột thì dài hơn, hở ra một
    // khoảng trống ngay sau tiêu đề trong khi phía bộ lọc vẫn đúng bằng
    // `column-gap` — cả thanh lệch sang trái. Dương là hở chỗ trống, âm là
    // tiêu đề tràn ra ngoài cột (h1 không `truncate` nên không co lại được).
    titleSlack: brand.lastElementChild.getBoundingClientRect().right - box(brand).right,
  };
});
const gapLeft = Math.round(header.filters.left - header.brand.right);
const gapRight = Math.round(header.meta.left - header.filters.right);
report(
  'header: cột tiêu đề ôm sát nội dung (không hở, không tràn)',
  Math.abs(header.titleSlack) <= 4,
  `lệch=${Math.round(header.titleSlack)}px`
);
report(
  'header: khoảng hở giữa tiêu đề và bộ lọc cân với khoảng hở giữa bộ lọc và đồng hồ',
  Math.abs(gapLeft - gapRight) <= 8,
  `trái=${gapLeft}px, phải=${gapRight}px`
);

// Bộ lọc phải trải đều 5 cột, không bị co lại cụt khi cột giữa rộng ra.
const filterWidths = await page.evaluate(() =>
  [...document.querySelector('header section').children].map((node) =>
    Math.round(node.getBoundingClientRect().width)
  )
);
const evenColumns = Math.max(...filterWidths) - Math.min(...filterWidths) <= 2;
report(
  'header: 5 ô lọc rộng bằng nhau',
  evenColumns && filterWidths.length === 5,
  filterWidths.join('/')
);

// Nút toàn màn hình: chỉ còn icon, nhãn nằm ở aria-label/title để trình đọc
// màn hình và tooltip vẫn đọc được.
const fullscreen = await page.evaluate(() => {
  const button = [...document.querySelectorAll('header button')].find((node) =>
    /toàn màn hình|full screen|全屏/i.test(node.getAttribute('aria-label') ?? '')
  );
  if (!button) return null;
  return {
    label: button.getAttribute('aria-label'),
    title: button.getAttribute('title'),
    text: button.innerText.trim(),
    width: Math.round(button.getBoundingClientRect().width),
  };
});
report(
  'header: nút toàn màn hình còn nhãn trợ giúp',
  Boolean(fullscreen?.label && fullscreen?.title),
  JSON.stringify(fullscreen)
);
report(
  'header: nút toàn màn hình chỉ hiện icon',
  fullscreen?.text === '' && (fullscreen?.width ?? 99) <= 44,
  `chữ="${fullscreen?.text}", rộng=${fullscreen?.width}px`
);

/* -------------------------------------------------------------------------- */
/*  3. Dải công đoạn: cảnh báo WIP nằm ở tooltip, không nằm trong thẻ         */
/* -------------------------------------------------------------------------- */

const stripText = await page.locator('ol li').first().locator('xpath=..').innerText();
report(
  'dải: không còn huy hiệu "WIP <số>" nằm trong thẻ',
  !/\bWIP\s+\d/.test(stripText),
  stripText.replace(/\n/g, ' | ')
);

// Cảnh báo WIP phải bám shadcn: chính thẻ công đoạn là trigger, không phải một
// huy hiệu button lồng bên trong, và không được dùng `title` thuần của trình
// duyệt (title hiện sau cả giây, không định dạng được, không khoá được).
const cardHooks = await page.evaluate(() => {
  const card = document.querySelector('ol li').firstElementChild;
  return {
    isTrigger: card.getAttribute('data-slot') === 'tooltip-trigger',
    title: card.getAttribute('title'),
    nestedTriggers: card.querySelectorAll('[data-slot=tooltip-trigger]').length,
  };
});
report(
  'dải: chính thẻ công đoạn là trigger của tooltip',
  cardHooks.isTrigger,
  JSON.stringify(cardHooks)
);
report(
  'dải: thẻ không dùng title thuần của trình duyệt',
  cardHooks.title === null,
  String(cardHooks.title)
);

// station vượt ngưỡng WIP là D08 (Testing, WIP 330 > 220)
const wipCard = page.locator('ol li').nth(7).locator('[data-slot=tooltip-trigger]');
await wipCard.hover();
await page.waitForTimeout(700);
const tooltip = page.locator('[data-slot=tooltip-content]');
const tooltipText = (await tooltip.count())
  ? (await tooltip.first().innerText()).replace(/\n/g, ' | ')
  : '';
report('dải: rê vào thẻ ra tooltip shadcn', (await tooltip.count()) > 0, tooltipText);
report(
  'dải: tooltip có đủ WIP và ngưỡng',
  /330/.test(tooltipText) && /220/.test(tooltipText),
  tooltipText
);

/* -------------------------------------------------------------------------- */
/*  4. Biểu đồ đủ cao để đọc                                                   */
/* -------------------------------------------------------------------------- */

const charts = await page.evaluate(() => {
  // Section biểu đồ là thẻ duy nhất chứa nút đổi bố cục (toggle-group).
  const grid = document.querySelector('section:has([data-slot=toggle-group]) > div:last-child');
  return [...grid.children].map((card) => {
    const svg = card.querySelector('svg');
    return {
      cardHeight: Math.round(card.getBoundingClientRect().height),
      plotHeight: svg ? Math.round(svg.getBoundingClientRect().height) : 0,
    };
  });
});
report('biểu đồ: đủ 3 thẻ', charts.length === 3, String(charts.length));
report(
  'biểu đồ: thẻ cao hơn 220px',
  charts.every((chart) => chart.cardHeight > 220),
  charts.map((c) => c.cardHeight).join('/')
);
report(
  'biểu đồ: vùng vẽ chiếm phần lớn chiều cao thẻ (không bị bóp)',
  charts.every((chart) => chart.plotHeight > chart.cardHeight * 0.55),
  charts.map((c) => `${c.plotHeight}/${c.cardHeight}`).join(' ')
);

await browser.close();

console.log(`\n${failed === 0 ? 'LỚP VỎ DASHBOARD ĐÚNG' : `${failed} KIỂM TRA SAI`}`);
process.exit(failed === 0 ? 0 : 1);

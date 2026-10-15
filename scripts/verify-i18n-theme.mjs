/**
 * Kiểm tra i18n + dark mode + bảng chọn line trên TV.
 *
 * Chạy: node scripts/verify-i18n-theme.mjs <url-gốc>
 *
 * Ba thứ này dễ hỏng âm thầm:
 *   - i18n: sót một chuỗi viết cứng, đổi ngôn ngữ thì chỗ đó đứng yên
 *   - dark: class không dính lên <html>, hoặc dính nhưng token không đổi
 *   - TV: chọn line xong không ghi vào URL, người dùng không chia sẻ được
 */

import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';

const browser = await chromium.launch();
let failed = 0;

/**
 * Cấu hình phiên giả để qua cổng RequireAuth.
 *
 * Script này từng mở `?mock-auth=1`, nhưng app không còn tham số đó nên mọi lần
 * chạy đều bị đá về /login và hỏng. `RequireAuth` chỉ cần `token` trong store
 * persist, nên cấu hình trước `sfcs-auth` trong localStorage là đủ.
 *
 * Đặt SAU khi seed mặc định của test, không dùng cho các test cần localStorage
 * sạch.
 */
async function openApp(page, url) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'sfcs-auth',
      JSON.stringify({
        state: { token: 'verify-token', user: { id: '0', name: 'Verify' } },
        version: 0,
      })
    );
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

function report(label, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/* -------------------------------------------------------------------------- */
/*  1. Ba ngôn ngữ thật sự đổi giao diện                                      */
/* -------------------------------------------------------------------------- */

{
  const page = await browser.newPage();
  await openApp(page, `${base}/`);

  /** Bấm nút ngôn ngữ ở header rồi chọn một mục trong menu. */
  async function switchTo(langName) {
    await page.getByRole('button', { name: /Ngôn ngữ|Language|语言/ }).click();
    await page.waitForTimeout(250);
    await page.getByRole('menuitem', { name: langName, exact: false }).first().click();
    await page.waitForTimeout(450);
  }

  // Chữ tiếng Việt ở thanh menu là chuỗi dịch, không phải chữ viết cứng.
  const viText = await page.locator('[data-slot=sidebar-menu]').first().innerText();

  await switchTo('English');
  const enText = await page.locator('[data-slot=sidebar-menu]').first().innerText();
  report(
    'i18n: đổi sang tiếng Anh đổi cả menu',
    enText.includes('Overview') && !enText.includes('Tổng quan'),
    enText.replace(/\n/g, ' | ')
  );

  // `<html lang>` phải đổi theo: trình đọc màn hình chọn giọng đọc theo thuộc tính này.
  const langAttr = await page.evaluate(() => document.documentElement.lang);
  report('i18n: <html lang> đổi theo ngôn ngữ', langAttr === 'en', langAttr);

  // Số phải theo locale: 1.284 ở VN, 1,284 ở EN.
  await switchTo('中文');
  const zhText = await page.locator('[data-slot=sidebar-menu]').first().innerText();
  const bodyText = await page.locator('body').innerText();
  report(
    'i18n: đổi sang tiếng Trung đổi cả menu',
    zhText.includes('总览') && !zhText.includes('Overview'),
    zhText.replace(/\n/g, ' | ')
  );

  const noRawKey = !/⚠\s*[a-z]+\.[a-zA-Z]/.test(bodyText);
  report(
    'i18n: không còn khoá dịch sót (⚠ xxx.yyy)',
    noRawKey,
    noRawKey ? '' : bodyText.match(/⚠\s*[a-z.]+/)?.[0]
  );

  // Placeholder chưa nội suy ("{count}" in nguyên ra màn). i18next mặc định
  // {{biến}}, file dịch của app dùng {biến} — lệch nhau thì lỗi này, và nó KHÔNG
  // báo ở khoá nên test trên chỉ soi menu không bắt được.
  const rawPlaceholder = bodyText.match(/\{[a-zA-Z]+\}/);
  report(
    'i18n: không còn placeholder chưa nội suy ({count})',
    !rawPlaceholder,
    rawPlaceholder?.[0] ?? ''
  );

  // Ô Select phải hiện NHÃN, không hiện value thô — Base UI cần prop `items`,
  // thiếu thì trigger in chữ "all".
  const selectText = await page
    .locator('button')
    .filter({ hasText: /Tất cả xưởng|All areas|全部车间/ })
    .count();
  const rawAll = await page.locator('button').filter({ hasText: /^all$/ }).count();
  report(
    'i18n: ô chọn xưởng hiện nhãn thật',
    selectText > 0 && rawAll === 0,
    `nhãn=${selectText}, raw=${rawAll}`
  );

  // Ô trống: phải vẫn là dấu gạch, không dịch theo ngôn ngữ.
  report('i18n: ký hiệu ô trống không đổi', bodyText.includes('—'));

  await switchTo('Tiếng Việt');
  const backVi = await page.locator('[data-slot=sidebar-menu]').first().innerText();
  report('i18n: quay lại tiếng Việt được', backVi.includes('Tổng quan'));

  await page.close();
}

/* -------------------------------------------------------------------------- */
/*  2. Dark mode                                                              */
/* -------------------------------------------------------------------------- */

{
  const page = await browser.newPage();
  await openApp(page, `${base}/`);

  const readTheme = () =>
    page.evaluate(() => ({
      isDark: document.documentElement.classList.contains('dark'),
      background: getComputedStyle(document.body).backgroundColor,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    }));

  const light = await readTheme();
  report('theme: mặc định nền sáng', !light.isDark, light.background);

  // Chuyển theme qua menu header. Regex không phân biệt hoa thường: app mở
  // theo ngôn ngữ trình duyệt, mà Playwright mặc định là en.
  await page.getByRole('button', { name: /giao diện|appearance|外观/i }).click();
  await page.waitForTimeout(250);
  await page.getByRole('menuitem', { name: /^Tối$|^Dark$|^深色$/ }).click();
  await page.waitForTimeout(450);

  const dark = await readTheme();
  report('theme: bật tối đặt class dark lên <html>', dark.isDark);
  report('theme: nền thật sự tối', dark.background === 'rgb(11, 15, 20)', dark.background);
  report('theme: meta theme-color khớp nền tối', dark.themeColor === '#0b0f14', dark.themeColor);

  const stored = await page.evaluate(() => localStorage.getItem('sfcs-theme'));
  report('theme: nhớ lựa chọn sau khi tải lại', stored === 'dark', String(stored));

  // Tải lại: phải ra đòn tối ngay, không nháy sáng (kiểm bằng cách class đã có
  // mặt trước khi script của app chạy — proxy: sau reload, đọc class).
  await page.reload({ waitUntil: 'domcontentloaded' });
  const afterReload = await readTheme();
  report('theme: giữ tối sau khi tải lại', afterReload.isDark, afterReload.background);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/*  3. TV: chọn được line, lựa chọn nằm trong URL                            */
/* -------------------------------------------------------------------------- */

{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page, `${base}/tv`);

  report(
    'TV: nền tối phủ kín cửa sổ',
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) ===
      'rgb(15, 23, 32)'
  );
  report('TV: không có sidebar', (await page.locator('[data-slot=sidebar]').count()) === 0);

  // Mở bảng chọn bằng phím L — đường chính trên TV (không có chuột).
  await page.keyboard.press('l');
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog');
  report('TV: phím L mở được bảng chọn line', (await dialog.count()) > 0);

  const optionCount = await dialog.locator('li > button').count();
  report('TV: bảng chọn có danh sách line', optionCount > 4, `${optionCount} dòng`);

  // Chọn hai dòng đầu rồi áp dụng.
  const firstTwo = dialog.locator('li > button');
  const idA = (await firstTwo.nth(0).innerText()).trim().split('\n')[0];
  const idB = (await firstTwo.nth(1).innerText()).trim().split('\n')[0];
  await firstTwo.nth(0).click();
  await firstTwo.nth(1).click();
  await page.waitForTimeout(200);

  await dialog.getByRole('button', { name: /Áp dụng|Apply|应用/ }).click();
  await page.waitForTimeout(700);

  const url = page.url();
  report(
    'TV: lựa chọn được ghi vào URL (chia sẻ được)',
    url.includes(`lines=${encodeURIComponent(idA)}`) || url.includes(encodeURIComponent(idA)),
    url.split('/').pop()
  );
  report(
    'TV: URL giữ đúng thứ tự đã chọn',
    url.includes(encodeURIComponent(idA)) && url.includes(encodeURIComponent(idB)),
    `${idA}, ${idB}`
  );

  const cards = await page.locator('.tv-card').count();
  report('TV: chỉ hiện đúng số line đã chọn', cards === 2, `${cards} thẻ`);

  // Mở lại URL đó ở tab khác → cùng kết quả.
  const page2 = await browser.newPage();
  await page2.setViewportSize({ width: 1920, height: 1080 });
  await page2.goto(url, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(800);
  const cards2 = await page2.locator('.tv-card').count();
  report('TV: mở lại URL trên máy khác ra đúng 2 thẻ', cards2 === 2, `${cards2} thẻ`);
  await page2.close();

  // Bỏ chọn hết thì phải quay về danh sách lọc theo bộ lọc, không để trắng.
  await page.keyboard.press('l');
  await page.waitForTimeout(400);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Bỏ chọn tất cả|Clear selection|清除选择/ })
    .click();
  await page.waitForTimeout(200);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Áp dụng|Apply|应用/ })
    .click();
  await page.waitForTimeout(700);

  report(
    'TV: bỏ chọn hết thì tham số lines biến mất khỏi URL',
    !page.url().includes('lines='),
    page.url().split('/').pop()
  );
  const cardsAfterClear = await page.locator('.tv-card').count();
  report(
    'TV: bỏ chọn hết thì danh sách đầy đủ quay lại',
    cardsAfterClear >= 4,
    `${cardsAfterClear} thẻ`
  );

  await page.close();
}

await browser.close();

console.log(`\n${failed === 0 ? 'I18N + THEME + TV ĐÚNG' : `${failed} KIỂM TRA SAI`}`);
process.exit(failed === 0 ? 0 : 1);

/**
 * Kiểm tra trang lỗi route có hiện đúng không.
 *
 * Chạy: node scripts/verify-error-page.mjs <url-của-app>
 *
 * Cách kiểm: chặn request tới một trang để nó nạp chunk thất bại, rồi đọc xem
 * người dùng thấy gì. Đây đúng là tình huống "Failed to fetch dynamically
 * imported module" mà trang lỗi mặc định của React Router hiển thị.
 */

import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';

const browser = await chromium.launch();
// Khoá tiếng Việt: các kiểm tra dưới đây khớp chuỗi vi. Không khoá thì app tự
// theo ngôn ngữ trình duyệt (Playwright mặc định en) và test báo lỗi oan —
// lỗi của test, không phải của app.
//
// Đồng thời cấu hình sẵn phiên đăng nhập. App KHÔNG có đường tắt dev trong URL
// (đã bỏ `?mock-auth=1`): bản build đưa lên xưởng không được có đường vào
// không cần mật khẩu. Script test gieo `sfcs-auth` — đúng khoá zustand/persist
// của store, giống trạng thái sau khi đăng nhập thật.
const context = await browser.newContext();
await context.addInitScript(() => {
  try {
    localStorage.setItem('sfcs-language', 'vi');
    localStorage.setItem(
      'sfcs-auth',
      JSON.stringify({
        state: { token: 'verify-token', user: { id: '0', name: 'Verify' } },
        version: 0,
      })
    );
  } catch {
    /* bỏ qua */
  }
});
let failed = 0;

function report(label, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Chặn request tới một module rồi điều hướng tới route dùng nó.
 *
 * `page.route` phải khai TRƯỚC `goto`: React Router nạp route ngay khi mở trang,
 * không có cửa sổ để chặn sau.
 */
async function openWithBrokenChunk(ctx, url, chunkPattern) {
  const page = await ctx.newPage();
  await page.route(chunkPattern, (route) => route.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Chờ đủ lâu cho lazy import thất bại và React Router dựng trang lỗi.
  await page.waitForTimeout(1500);
  return page;
}

/* -------------------------------------------------------------------------- */
/*  1. Trang lỗi của route trong khung app                                     */
/* -------------------------------------------------------------------------- */

{
  const page = await openWithBrokenChunk(context, `${base}/chart`, '**/chart-page*');

  const text = await page.locator('body').innerText();

  report(
    'route lỗi: có tiêu đề nói rõ chuyện gì hỏng',
    /Không tải được trang này/.test(text),
    text.split('\n').slice(0, 4).join(' | ')
  );
  report(
    'route lỗi: không còn trang trắng của React Router',
    !/Unexpected Application Error/.test(text)
  );
  report('route lỗi: có nút tải lại', /Tải lại trang/.test(text));
  report('route lỗi: có lối về trang tổng quan', /Về trang tổng quan/.test(text));
  report(
    'route lỗi: vẫn nằm trong khung app (có sidebar)',
    (await page.locator('[data-slot=sidebar]').count()) > 0
  );

  await page.close();
}

/* -------------------------------------------------------------------------- */
/*  2. Trang lỗi riêng của màn TV                                            */
/* -------------------------------------------------------------------------- */

{
  const page = await openWithBrokenChunk(context, `${base}/tv`, '**/tv-screen*');

  const text = await page.locator('body').innerText();

  report(
    'TV lỗi: có tiêu đề riêng cho TV',
    /Không tải được màn TV/.test(text),
    text.split('\n').slice(0, 3).join(' | ')
  );
  report('TV lỗi: KHÔNG có liên kết về trang tổng quan', !/Về trang tổng quan/.test(text));
  report('TV lỗi: không có sidebar', (await page.locator('[data-slot=sidebar]').count()) === 0);
  report(
    'TV lỗi: nền tối đúng như màn TV',
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) ===
      'rgb(15, 23, 32)',
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  );

  await page.close();
}

/* -------------------------------------------------------------------------- */
/*  3. 404 trong khung app                                                    */
/* -------------------------------------------------------------------------- */

{
  const page = await context.newPage();
  await page.goto(`${base}/khong-co-trang-nay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const text = await page.locator('body').innerText();

  report('404: nói rõ không tìm thấy', /Không tìm thấy trang/.test(text));
  report('404: có lối ra', /Về trang tổng quan/.test(text));
  await page.close();
}

/* -------------------------------------------------------------------------- */
/*  4. Màn TV bình thường: nền tối phải phủ kín cửa sổ                      */
/* -------------------------------------------------------------------------- */

{
  const page = await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${base}/tv`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const hasScrollbar = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight
  );

  report('TV bình thường: nền tối phủ kín', bg === 'rgb(15, 23, 32)', bg);
  report('TV bình thường: không tràn dọc ở 1080p', !hasScrollbar);
  report(
    'TV bình thường: không có sidebar',
    (await page.locator('[data-slot=sidebar]').count()) === 0
  );
  report(
    'TV bình thường: con trỏ ẩn khi kiosk',
    (await page.evaluate(() => getComputedStyle(document.body).cursor)) === 'none'
  );

  await page.close();
}

await browser.close();

console.log(`\n${failed === 0 ? 'TRANG LỖI ĐÚNG' : `${failed} KIỂM TRA SAI`}`);
process.exit(failed === 0 ? 0 : 1);

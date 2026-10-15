/**
 * Kiểm tra luồng đăng nhập và cổng bảo vệ.
 *
 * Chạy: node scripts/verify-auth.mjs <url-gốc>
 *
 * Section 2 cần tài khoản MES thật: đặt VERIFY_USERNAME + VERIFY_PASSWORD.
 * Không đặt thì section đó SKIP — script không bao giờ dùng tài khoản giả.
 *
 * Bốn thứ dễ hỏng âm thầm:
 *   - Guard: mở thẳng trang trong mà chưa đăng nhập phải bị đẩy về /login
 *   - Sai mật khẩu: giữ username, XOÁ password, focus vào ô password (luật form)
 *   - Đăng nhập xong quay về đúng trang định vào (?back=)
 *   - Đăng xuất: về /login và phiên bị xoá
 */

import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';

const browser = await chromium.launch();
let failed = 0;

/**
 * Cấu hình phiên giả để qua cổng RequireAuth.
 *
 * App KHÔNG có đường tắt dev nào trong URL (đã bỏ `?mock-auth=1`): bản build
 * đưa lên xưởng không được có đường vào không cần mật khẩu. Nên script test
 * cấu hình `sfcs-auth` trong localStorage — đúng khoá zustand/persist của store,
 * giống hệt trạng thái sau khi đăng nhập thật.
 *
 * CHỈ gieo một lần: `addInitScript` chạy ở MỌI lần điều hướng, nên gieo vô
 * điều kiện sẽ đăng nhập lại ngay sau khi test đăng xuất — test "vào trang trong
 * bị chặn lại" luôn đỏ. Đã có khoá thì để nguyên, kể cả khi nó đã bị xoá.
 */
const SEED_AUTH = () => {
  if (localStorage.getItem('sfcs-auth')) return;
  localStorage.setItem(
    'sfcs-auth',
    JSON.stringify({
      state: { token: 'verify-token', user: { id: '0', name: 'Verify' } },
      version: 0,
    })
  );
};

async function openSignedIn(page, url) {
  await page.addInitScript(SEED_AUTH);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
}

function report(label, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/* -------------------------------------------------------------------------- */
/*  1. Cổng bảo vệ                                                            */
/* -------------------------------------------------------------------------- */

{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/line/AP-6100`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  report(
    'guard: chưa đăng nhập bị đẩy về /login',
    page.url().includes('/login'),
    page.url().split(base)[1]
  );
  report(
    'guard: ?back= trỏ về đúng trang định vào',
    decodeURIComponent(page.url()).includes('back=/line/AP-6100'),
    page.url().split('?')[1]
  );
  report(
    'guard: trang login có logo app',
    (await page.locator('body').innerText()).includes('SFCS')
  );

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  2. Sai mật khẩu → đúng mật khẩu (tài khoản MES thật qua env)              */
/* -------------------------------------------------------------------------- */

const VERIFY_USERNAME = process.env.VERIFY_USERNAME;
const VERIFY_PASSWORD = process.env.VERIFY_PASSWORD;

if (!VERIFY_USERNAME || !VERIFY_PASSWORD) {
  console.log('SKIP  login: thiếu VERIFY_USERNAME/VERIFY_PASSWORD nên bỏ qua đăng nhập thật');
} else {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/login?back=${encodeURIComponent('/chart')}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(500);

  // autoFocus: con trỏ nằm sẵn ở ô username
  report(
    'login: con trỏ nằm sẵn ở ô đầu',
    (await page.evaluate(() => document.activeElement?.id)) === 'username'
  );

  await page.fill('#username', VERIFY_USERNAME);
  // Mật khẩu sai chắc chắn — xem trạng thái báo lỗi.
  await page.fill('#password', 'sai-mat-khau-chac-chan-sai');
  await page.getByRole('button', { name: /Đăng nhập|Sign in|登录/ }).click();
  await page.waitForTimeout(1200);

  const bodyText = await page.locator('body').innerText();
  report('login: sai mật khẩu có câu báo', /chưa đúng|incorrect|不正确/i.test(bodyText));
  report(
    'login: câu báo mơ hồ cố ý (không nói sai ô nào)',
    !/mật khẩu sai|sai mật khẩu|username.*not exist/i.test(bodyText)
  );
  report(
    'login: GIỮ username sau khi sai',
    (await page.inputValue('#username')) === VERIFY_USERNAME
  );
  report('login: XOÁ password sau khi sai', (await page.inputValue('#password')) === '');
  report(
    'login: focus đưa về ô password',
    (await page.evaluate(() => document.activeElement?.id)) === 'password'
  );
  report('login: vẫn ở trang login', page.url().includes('/login'));

  // Gõ lại đúng: đăng nhập MES thật
  await page.fill('#password', VERIFY_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập|Sign in|登录/ }).click();
  await page.waitForTimeout(1500);

  report(
    'login: đăng nhập xong quay về đúng trang ?back=',
    page.url().includes('/chart'),
    page.url().split(base)[1]
  );
  report(
    'login: phiên được lưu',
    (await page.evaluate(() => localStorage.getItem('sfcs-auth')))?.includes('token')
  );

  // Mở trang khác: không bị đẩy về login nữa
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  report('guard: đã đăng nhập thì vào được trang trong', !page.url().includes('/login'));

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  3. Đăng xuất                                                              */
/* -------------------------------------------------------------------------- */

{
  const context = await browser.newContext();
  const page = await context.newPage();
  await openSignedIn(page, `${base}/`);
  report('seed phiên: cấu hình sfcs-auth vào được app', !page.url().includes('/login'));

  await page.getByRole('button', { name: /Tài khoản|Account|账号/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: /Đăng xuất|Sign out|退出登录/ }).click();
  await page.waitForTimeout(900);

  report('logout: về trang đăng nhập', page.url().includes('/login'), page.url().split(base)[1]);
  const stored = await page.evaluate(() => localStorage.getItem('sfcs-auth'));
  report(
    'logout: phiên bị xoá',
    !stored?.includes('"token":"') || stored?.includes('"token":null'),
    stored?.slice(0, 60)
  );

  // Và đi thẳng vào trang trong: phải bị chặn lại
  await page.goto(`${base}/chart`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  report('logout: vào trang trong bị chặn lại', page.url().includes('/login'));

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  4. Trang quên mật khẩu                                                    */
/* -------------------------------------------------------------------------- */

{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Link "Quên mật khẩu?" phải nằm SAU ô password trong DOM (thứ tự Tab).
  const tabOrder = await page.evaluate(() => {
    const focusables = [...document.querySelectorAll('input, a[href], button')]
      .filter((el) => !el.disabled && el.offsetParent !== null)
      .map((el) => el.id || el.textContent.trim().slice(0, 18));
    return focusables;
  });
  const passwordIndex = tabOrder.indexOf('password');
  const forgotIndex = tabOrder.findIndex((label) =>
    /Quên mật khẩu|Forgot password|忘记密码/.test(label)
  );
  report(
    'forgot: link nằm sau ô password trong DOM (Tab đúng thứ tự)',
    forgotIndex > passwordIndex,
    `password@${passwordIndex} < link@${forgotIndex}`
  );

  await page.getByRole('link', { name: /Quên mật khẩu|Forgot password|忘记密码/ }).click();
  await page.waitForTimeout(700);
  const text = await page.locator('body').innerText();
  report('forgot: trang nói rõ liên hệ IT', /IT/.test(text));
  report('forgot: có lối quay lại đăng nhập', /đăng nhập|sign in|登录/i.test(text));

  await context.close();
}

await browser.close();

console.log(`\n${failed === 0 ? 'LUỒNG ĐĂNG NHẬP ĐÚNG' : `${failed} KIỂM TRA SAI`}`);
process.exit(failed === 0 ? 0 : 1);

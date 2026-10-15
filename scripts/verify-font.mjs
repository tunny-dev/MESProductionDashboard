/**
 * Kiểm tra font có vẽ được chữ tiếng Việt thật không.
 *
 * Chạy: node scripts/verify-font.mjs <url> [tên font]
 *
 * Vì sao cần script này: tên file "vietnamese" trong gói font không bảo chứng gì,
 * và đo bề rộng bằng canvas không phân biệt được "font vẽ thật" với "trình duyệt
 * âm thầm fallback sang font khác". `document.fonts.check()` là API đúng cho việc
 * này: nó trả false nếu font chưa nạp HOẶC không có glyph đó.
 */

import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/';
const family = process.argv[3] ?? 'Manrope Variable';

// Những chữ tiếng Việt khó nhất: dấu nặng + ngã + hỏi chồng lên nhau.
const SAMPLES = ['ẹ', 'ợ', 'ữ', 'ặ', 'ễ', 'ẫ', 'ộ', 'ớ', 'ằ', 'ẳ', 'ẵ', 'Đạt', 'Cảnh báo', 'Trễ'];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle' });

const result = await page.evaluate(
  async ({ font, samples }) => {
    // Nạp mọi subset rồi chờ. `check()` trả false cả với chữ không dấu nếu font
    // chưa nạp, nên phải chờ thật sự trước khi kết luận.
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('400 40px "' + font + '"', 'Đạt'),
      document.fonts.load('400 40px "' + font + '"', 'ẹ'),
      document.fonts.load('700 40px "' + font + '"', 'Trễ'),
    ]);
    await document.fonts.ready;

    const fontSpec = `400 40px "${font}"`;
    const faces = [...document.fonts].filter((f) => f.family === font);

    return {
      bodyFont: getComputedStyle(document.body).fontFamily,
      faces: faces.map((f) => `${f.status} w:${f.weight}`),
      loadedCount: faces.filter((f) => f.status === 'loaded').length,
      // check() là API đúng, nhưng chỉ nói "font có sẵn để vẽ chuỗi này không".
      samples: samples.map((text) => ({
        text,
        canRender: document.fonts.check(fontSpec, text),
      })),
    };
  },
  { font: family, samples: SAMPLES }
);

await browser.close();

console.log('Font trên <body>:', result.bodyFont);
console.log(`Font Manrope: ${result.loadedCount}/${result.faces.length} subset đã nạp`);
console.log('  ' + (result.faces.join(', ') || 'KHÔNG CÓ @font-face nào'));

let failed = 0;
console.log('\nGlyph tiếng Việt — Manrope vẽ được hay không:');
for (const sample of result.samples) {
  if (!sample.canRender) failed += 1;
  console.log(`${sample.canRender ? 'PASS' : 'FAIL'}  "${sample.text}"`);
}

if (result.loadedCount === 0) {
  console.log('\nFAIL  Manrope chưa được nạp — kiểm tra @import trong src/index.css');
  process.exit(1);
}

console.log(`\n${failed === 0 ? 'FONT ĐÚNG, ĐỦ GLYPH' : `THIẾU ${failed} KÝ TỰ`}`);
process.exit(failed === 0 ? 0 : 1);

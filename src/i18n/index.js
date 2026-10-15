/**
 * i18n — ba ngôn ngữ: tiếng Việt, tiếng Anh, tiếng Trung.
 *
 * Toàn bộ chuỗi nằm trong file JSON, không viết cứng vào JSX: thêm ngôn ngữ thứ
 * tư chỉ cần thêm một file JSON và một dòng ở đây, không phải đụng component.
 *
 * Ngôn ngữ lưu vào localStorage và gắn lên <html lang> — trình đọc màn hình đọc
 * `lang` để chọn giọng đọc đúng, đặt sai thì nó đọc tiếng Việt bằng giọng Anh.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { readPreference, writePreference } from '@/lib/preferences';
import en from './locales/en.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';

export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

/** Đọc ngôn ngữ đã lưu, rồi tới ngôn ngữ của trình duyệt. */
function detectLanguage() {
  const stored = readPreference(
    'language',
    LANGUAGES.map((lang) => lang.code),
    null
  );
  if (stored) return stored;

  const browserLang = window.navigator?.language?.slice(0, 2);
  return LANGUAGES.some((lang) => lang.code === browserLang) ? browserLang : 'vi';
}

export const initialLanguage = detectLanguage();

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: initialLanguage,
  fallbackLng: 'vi',
  // Dự phòng khi sót khoá: hiện khoá vi thay vì trả về chuỗi "table.line" thô,
  // để lỗi sót lộ ra ngay khi đọc giao diện thay vì lọt vào bản dựng.
  parseMissingKeyHandler: (key) => `⚠ ${key}`,
  interpolation: {
    // React tự escape, escape lần hai sẽ ra chuỗi "&amp;" thật.
    escapeValue: false,
    // Placeholder một ngoặc `{count}`: đúng cách viết của file dịch trong dự án
    // này. i18next mặc định `{{count}}` — để mặc định thì mọi biến in ra chữ
    // "{count}" nguyên vẹn, và không chỗ nào báo lỗi vì khoá vẫn khớp.
    prefix: '{',
    suffix: '}',
  },
  returnNull: false,
});

document.documentElement.lang = initialLanguage;

/** Đổi ngôn ngữ và nhớ lựa chọn. */
export function changeLanguage(code) {
  i18n.changeLanguage(code);
  document.documentElement.lang = code;
  writePreference('language', code);
}

export { i18n };

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { readPreference, writePreference } from '@/core/utils/preferences';
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
  parseMissingKeyHandler: (key) => `⚠ ${key}`,
  interpolation: {
    escapeValue: false,
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

// Tự động đồng bộ thay đổi ngôn ngữ giữa các tab trình duyệt (Cross-tab sync)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'sfcs-language' && event.newValue) {
      const newLang = event.newValue;
      if (newLang !== i18n.language && LANGUAGES.some((l) => l.code === newLang)) {
        i18n.changeLanguage(newLang);
        document.documentElement.lang = newLang;
      }
    }
  });
}

export { i18n };

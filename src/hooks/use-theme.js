import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { readPreference, writePreference } from '@/lib/preferences';

const STORAGE_KEY = 'sfcs-theme';
const THEMES = ['light', 'dark', 'system'];

function prefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Lựa chọn đang lưu, hoặc 'system' khi người dùng chưa chọn. */
export function getStoredTheme() {
  return readPreference('theme', THEMES, 'system');
}

/** Theme thật sự áp dụng, sau khi đã giải 'system' thành sáng hay tối. */
export function resolveTheme(theme) {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light';
  return theme;
}

export function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  // `theme-color` cho thanh trình duyệt trên mobile; phải khớp nền thật.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0b0f14' : '#eceff2');
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => prefersDark(),
    () => false
  );

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    applyTheme(theme);
    writePreference('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const effective = resolveTheme(current);
      return effective === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return { theme, resolvedTheme, setTheme: setThemeState, toggleTheme };
}

export const ThemeScript = `(function(){try{var k=localStorage.getItem('${STORAGE_KEY}');var t=(k==='light'||k==='dark')?k:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.querySelector('meta[name=theme-color]')?.setAttribute('content',t==='dark'?'#0b0f14':'#eceff2')}catch(e){}})();`;

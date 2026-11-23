import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { readPreference, writePreference } from '@/core/utils/preferences';

const STORAGE_KEY = 'sfcs-theme';
const THEMES = ['light', 'dark', 'system'];

function prefersDark() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  );
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const listeners = new Set();
function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

export function getStoredTheme() {
  return readPreference('theme', THEMES, 'system');
}

export function resolveTheme(theme) {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light';
  return theme;
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0b0f14' : '#eceff2');
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === 'sfcs-theme' || event.key === 'theme') {
      applyTheme(getStoredTheme());
      notifyListeners();
    }
  });

  const syncTheme = () => {
    applyTheme(getStoredTheme());
    notifyListeners();
  };
  window.addEventListener('focus', syncTheme);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncTheme();
    }
  });
}

function subscribeToTheme(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, () => 'system');

  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => prefersDark(),
    () => false
  );

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  const setTheme = useCallback((newTheme) => {
    writePreference('theme', newTheme);
    applyTheme(newTheme);
    notifyListeners();
  }, []);

  const toggleTheme = useCallback(() => {
    const effective = resolveTheme(getStoredTheme());
    const next = effective === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [setTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, resolvedTheme, setTheme, toggleTheme };
}

export const ThemeScript = `(function(){try{var k=localStorage.getItem('${STORAGE_KEY}');var t=(k==='light'||k==='dark')?k:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.querySelector('meta[name=theme-color]')?.setAttribute('content',t==='dark'?'#0b0f14':'#eceff2')}catch(e){}})();`;

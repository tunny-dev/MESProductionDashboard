const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getCookie(name) {
  if (typeof document === 'undefined') return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue;
  }
  return undefined;
}

export function setCookie(name, value, maxAge = DEFAULT_MAX_AGE) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

export function removeCookie(name) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; path=/; max-age=0`;
}

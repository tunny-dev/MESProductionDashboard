const PREFIX = 'sfcs-';

function keyOf(key) {
  return `${PREFIX}${key}`;
}

function available() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export const storage = {
  getItem(key) {
    try {
      if (!available()) return null;
      return window.localStorage.getItem(keyOf(key));
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (!available()) return false;
      window.localStorage.setItem(keyOf(key), String(value));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
  removeItem(key) {
    try {
      if (!available()) return;
      window.localStorage.removeItem(keyOf(key));
    } catch (error) {
      console.error(error);
    }
  },
  getJSON(key, fallback = null) {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },
  setJSON(key, value) {
    try {
      if (!available()) return false;
      window.localStorage.setItem(keyOf(key), JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
};

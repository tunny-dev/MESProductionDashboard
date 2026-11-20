const PREFIX = 'sfcs-';

function keyOf(key) {
  return `${PREFIX}${key}`;
}

function isAvailable(type = 'localStorage') {
  try {
    return typeof window !== 'undefined' && Boolean(window[type]);
  } catch {
    return false;
  }
}

function createStorageWrapper(type = 'localStorage') {
  return {
    getItem(key) {
      try {
        if (!isAvailable(type)) return null;
        return window[type].getItem(keyOf(key));
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    setItem(key, value) {
      try {
        if (!isAvailable(type)) return false;
        window[type].setItem(keyOf(key), String(value));
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    removeItem(key) {
      try {
        if (!isAvailable(type)) return;
        window[type].removeItem(keyOf(key));
      } catch (error) {
        console.error(error);
      }
    },
    getJSON(key, fallback = null) {
      const raw = this.getItem(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    setJSON(key, value) {
      try {
        if (!isAvailable(type)) return false;
        window[type].setItem(keyOf(key), JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
  };
}

export const storage = createStorageWrapper('localStorage');
storage.local = storage;
storage.session = createStorageWrapper('sessionStorage');
export default storage;

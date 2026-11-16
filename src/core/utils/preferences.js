import { storage } from './storage';

export function readPreference(key, allowed, fallback) {
  const stored = storage.getItem(key);
  if (stored !== null && allowed.includes(stored)) return stored;
  return fallback;
}

export function writePreference(key, value) {
  storage.setItem(key, value);
}

import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';

/**
 * API: `POST /api/common/auth/login` → envelope `{ success, data }` với
 * `data = { accessToken, refreshToken, expiresAt, userId, username, email, type }`.
 * `http` đã bóc sẵn envelope nên `data` ở đây là `AuthResponse` trực tiếp.
 * @param {any} data
 * @param {string} [fallbackUsername]
 * @returns {{ token: string, refreshToken: string|null, expiresAt: string|null,
 *            user: { id: string, name: string, email: string|null, type: string|null } }}
 */
function toSession(data, fallbackUsername) {
  const token = data?.accessToken;

  if (typeof token !== 'string' || token.trim() === '') {
    const error = new Error('API đăng nhập không trả về access token');
    error.status = 502;
    throw error;
  }

  const id = data?.userId ?? data?.username ?? fallbackUsername;

  return {
    token,
    refreshToken: data?.refreshToken ?? null,
    expiresAt: data?.expiresAt ?? null,
    user: {
      id: String(id ?? ''),
      name: String(data?.username ?? id ?? ''),
      email: data?.email ?? null,
      type: data?.type ?? null,
    },
  };
}

export async function login({ username, password }) {
  const data = await http.post(ENDPOINTS.auth.login, { username, password });
  return toSession(data, username);
}

export async function refreshSession(refreshToken) {
  const data = await http.post(ENDPOINTS.auth.refresh, { refreshToken });
  return toSession(data);
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  await http.post(ENDPOINTS.auth.logout, { refreshToken });
}

export async function fetchMe() {
  return http.get(ENDPOINTS.auth.me);
}

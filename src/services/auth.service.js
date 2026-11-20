import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';

/**
 * @param {{ username: string, password: string, company?: string }} credentials
 * @returns {Promise<{ token: string, refreshToken: string|null, expiresAt: string|null, user: { id: string, name: string, email: string|null, type: string|null } }>}
 */
export async function login({ username, password, company = '' }) {
  const data = await http.post(ENDPOINTS.auth.login, { username, password, company });

  const token = data?.accessToken ?? data?.token;
  if (!token) {
    const error = new Error('Hệ thống không trả về token xác thực hợp lệ');
    error.status = 502;
    throw error;
  }

  const remoteUser = data.user ?? {};
  const id = remoteUser.id ?? username;
  const name = remoteUser.name ?? id;

  return {
    token,
    refreshToken: data.refreshToken ?? null,
    expiresAt: data.expiresAt ?? null,
    user: {
      id: String(id),
      name: String(name),
      email: remoteUser.email ?? null,
      type: Array.isArray(remoteUser.roles) ? remoteUser.roles[0] : null,
    },
  };
}

export async function logout() {
  try {
    return await http.post(ENDPOINTS.auth.logout);
  } catch {
    return null;
  }
}

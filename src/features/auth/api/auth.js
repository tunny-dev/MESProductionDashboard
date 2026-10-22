import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';

/**
 * Đăng nhập MES.
 * @param {any} payload
 * @param {string} [fallbackUsername]
 * @returns {{ token: string, refreshToken: null, expiresAt: null,
 *            user: { id: string, name: string, email: null, type: null } }}
 */
function toSession(payload, fallbackUsername) {
  const candidates = [payload, payload?.data, payload?.result, payload?.data?.data];

  const session = candidates.find((candidate) => {
    const value =
      candidate?.token ?? candidate?.accessToken ?? candidate?.access_token ?? candidate?.jwt;
    return typeof value === 'string' && value.trim().length > 0;
  });

  const token = session?.token ?? session?.accessToken ?? session?.access_token ?? session?.jwt;

  if (typeof token !== 'string' || token.trim() === '') {
    const error = new Error('MES không trả về token đăng nhập');
    error.status = 502;
    throw error;
  }

  const remoteUser =
    session?.user ?? session?.profile ?? session?.account ?? payload?.user ?? payload?.data?.user;

  const id = remoteUser?.id ?? remoteUser?.userId ?? remoteUser?.username ?? fallbackUsername;
  const name = remoteUser?.name ?? remoteUser?.fullName ?? remoteUser?.displayName ?? id;

  return {
    token,
    refreshToken: null,
    expiresAt: null,
    user: {
      id: String(id ?? ''),
      name: String(name ?? id ?? ''),
      email: null,
      type: null,
    },
  };
}

export async function login({ username, password, company = '' }) {
  const payload = await http.post(ENDPOINTS.mes.auth, { username, password, company });
  return toSession(payload, username);
}

export async function fetchMe() {
  return null;
}

/**
 * Đăng xuất.
 */
export async function logout() {
  return null;
}

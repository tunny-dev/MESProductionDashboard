import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';

function normalizeMesSession(data, username) {
  const candidates = [data, data?.data, data?.result, data?.data?.data];
  const session = candidates.find((c) => {
    const t = c?.token ?? c?.accessToken ?? c?.access_token ?? c?.jwt;
    return typeof t === 'string' && t.trim().length > 0;
  });

  const token = session?.token ?? session?.accessToken ?? session?.access_token ?? session?.jwt;

  if (!token) {
    const error = new Error('MES response did not include a session token');
    error.status = 502;
    throw error;
  }

  const remoteUser =
    session?.user ?? session?.profile ?? session?.account ?? data?.user ?? data?.data?.user;
  const id = remoteUser?.id ?? remoteUser?.userId ?? remoteUser?.username ?? username;
  const name = remoteUser?.name ?? remoteUser?.fullName ?? remoteUser?.displayName ?? id;

  return {
    token,
    user: { id: String(id), name: String(name) },
  };
}

export async function login({ username, password }) {
  const data = await http.post(ENDPOINTS.mes.auth, { username, password, company: '' });
  return normalizeMesSession(data, username);
}

export async function fetchMe() {
  return http.get(ENDPOINTS.auth.me);
}

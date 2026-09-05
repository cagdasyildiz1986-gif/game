/**
 * Sunucu ile iletisim. Capacitor icinde calisirken API_BASE farkli olabilir,
 * bu yuzden window.SLOT_API_BASE ile ezilebilir.
 */
const BASE = (window.SLOT_API_BASE || '').replace(/\/$/, '');
const TOKEN_KEY = 'lucky-reels-token';

let token = localStorage.getItem(TOKEN_KEY) || null;

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* govde bos olabilir */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `İstek başarısız (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get token() {
    return token;
  },
  clearToken() {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
  },
  async config() {
    return request('/config');
  },
  async session(name) {
    const data = await request('/session', { method: 'POST', body: { token, name } });
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    return data;
  },
  async state() {
    return request('/state');
  },
  async setBet(bet) {
    return request('/bet', { method: 'POST', body: { bet } });
  },
  async spin(bet) {
    return request('/spin', { method: 'POST', body: { bet } });
  },
  async jackpots() {
    return request('/jackpots');
  },
  async setClientSeed(clientSeed) {
    return request('/fair/client-seed', { method: 'POST', body: { clientSeed } });
  },
  async rotateSeed() {
    return request('/fair/rotate', { method: 'POST' });
  }
};

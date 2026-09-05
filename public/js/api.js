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

function setToken(value) {
  token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

export const api = {
  get token() {
    return token;
  },
  clearToken() {
    setToken(null);
  },
  async config() {
    return request('/config');
  },
  async session(name) {
    const data = await request('/auth/session', { method: 'POST', body: { token, name } });
    setToken(data.token);
    return data;
  },

  /* ---- Hesap ---- */
  async me() {
    return request('/auth/me');
  },
  async register(username, password) {
    const data = await request('/auth/register', { method: 'POST', body: { username, password } });
    setToken(data.token);
    return data;
  },
  async login(username, password) {
    const data = await request('/auth/login', { method: 'POST', body: { username, password } });
    setToken(data.token);
    return data;
  },
  async avatars() {
    return request('/auth/avatars');
  },
  async updateProfile(patch) {
    return request('/auth/profile', { method: 'POST', body: patch });
  },
  async logout() {
    await request('/auth/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
  },

  /* ---- Site ---- */
  async home() {
    return request('/site/home');
  },
  async publicSettings() {
    return request('/site/settings');
  },
  async games(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    return request(`/site/games?${query}`);
  },
  async searchGames(q) {
    return request(`/site/search?q=${encodeURIComponent(q)}`);
  },
  async gameDetail(id) {
    return request(`/site/game/${encodeURIComponent(id)}`);
  },
  async openGame(id) {
    return request(`/site/game/${encodeURIComponent(id)}/open`, { method: 'POST' });
  },
  async toggleFavorite(id) {
    return request(`/site/favorite/${encodeURIComponent(id)}`, { method: 'POST' });
  },
  async tasks() {
    return request('/site/tasks');
  },
  async claimTask(id) {
    return request(`/site/tasks/${encodeURIComponent(id)}/claim`, { method: 'POST' });
  },

  /* ---- Yönetim ---- */
  async adminOverview() {
    return request('/admin/overview');
  },
  async adminUsers(query = '') {
    return request(`/admin/users?q=${encodeURIComponent(query)}`);
  },
  async adminAdjustBalance(userId, amount, reason) {
    return request(`/admin/users/${userId}/balance`, { method: 'POST', body: { amount, reason } });
  },
  async adminBan(userId, banned) {
    return request(`/admin/users/${userId}/ban`, { method: 'POST', body: { banned } });
  },
  async adminRole(userId, role) {
    return request(`/admin/users/${userId}/role`, { method: 'POST', body: { role } });
  },
  async adminSaveSettings(settings) {
    return request('/admin/settings', { method: 'POST', body: { settings } });
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
  /* ---- 7 HOT · Çan Zinciri ---- */
  hot: {
    config: () => request('/sevenhot/config'),
    state: () => request('/sevenhot/state'),
    setBet: (bet) => request('/sevenhot/bet', { method: 'POST', body: { bet } }),
    spin: (bet) => request('/sevenhot/spin', { method: 'POST', body: { bet } }),
    jackpots: (bet) => request(`/sevenhot/jackpots?bet=${encodeURIComponent(bet)}`)
  },

  /* ---- YILDIRIM · Göklerin Öfkesi ---- */
  storm: {
    config: () => request('/yildirim/config'),
    state: () => request('/yildirim/state'),
    setBet: (bet) => request('/yildirim/bet', { method: 'POST', body: { bet } }),
    spin: (bet) => request('/yildirim/spin', { method: 'POST', body: { bet } })
  },

  async setClientSeed(clientSeed) {
    return request('/fair/client-seed', { method: 'POST', body: { clientSeed } });
  },
  async rotateSeed() {
    return request('/fair/rotate', { method: 'POST' });
  }
};

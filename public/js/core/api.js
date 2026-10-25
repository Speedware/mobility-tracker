import { state } from './state.js';
import { goLogin } from './router.js';

export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !/\/api\/(login|register|me\/password)$/.test(url)) {
    state.me = null;
    goLogin();
  }
  if (!res.ok) throw new Error(data.error || 'Что-то пошло не так');
  return data;
}

export async function loadSession() {
  try {
    const me = await fetch('/api/me').then(r => (r.ok ? r.json() : null));
    if (me) { state.me = me.user; state.activeRental = me.activeRental; }
    state.registrationOpen = (await fetch('/api/config').then(r => r.json())).registrationOpen;
  } catch {}
}

export async function logout() {
  await api('POST', '/api/logout').catch(() => {});
  state.me = null;
  state.activeRental = null;
  goLogin();
}

export const fontsReady = () => Promise.race([document.fonts?.ready, new Promise(r => setTimeout(r, 2500))]);

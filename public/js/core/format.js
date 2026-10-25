export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const rub = n => `${Number(n || 0).toLocaleString('ru-RU')} ₽`;

export const plural = (n, [one, few, many]) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

const pad = n => String(n).padStart(2, '0');

export function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export const since = iso => duration(Date.now() - new Date(iso).getTime());
export const between = (from, to) => duration(new Date(to) - new Date(from));

export const fmtDate = iso => new Date(iso).toLocaleString('ru-RU',
  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const fmtShort = iso => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${pad(d.getFullYear() % 100)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const initialsOf = name => name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

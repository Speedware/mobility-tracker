import { api } from '../../core/api.js';
import { esc, rub } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { render } from '../../core/router.js';
import { deskShell, autoRefresh } from '../shell.js';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const BIKE_COLORS = {
  legend: '#F7D049', locomotive: '#E2574C', smart: '#57C78A', king: '#5AA9E6', uno: '#B980E0', u2: '#F2924A',
};
const FALLBACK_COLORS = ['#4DD0C4', '#E873A6', '#9CCC65', '#FFB74D', '#7986CB'];
const bikeColor = (name, i) => BIKE_COLORS[name.toLowerCase()] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

const dateShort = iso => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayOf = d => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };

const defaultRange = () => {
  const from = mondayOf(new Date());
  const to = new Date(from); to.setDate(to.getDate() + 6);
  return { from: isoDate(from), to: isoDate(to) };
};
let range = defaultRange();

// день недели для ровно 7-дневного периода, иначе число месяца — чтобы подписи не сливались на произвольном периоде
const dayLabel = (fromIso, i, total) => {
  const dt = new Date(fromIso); dt.setDate(dt.getDate() + i);
  return total === 7 ? DAYS[(dt.getDay() + 6) % 7] : pad(dt.getDate());
};

const kpi = (icon, label, value, sub = '') => `
  <div class="kpi db-kpi">
    <span class="db-kpi-label">${icon}${label}</span>
    <b>${value}</b>${sub ? `<small>${sub}</small>` : ''}
  </div>`;

function donut(bikes) {
  const total = bikes.reduce((s, b) => s + b.revenue, 0);
  let acc = 0;
  const stops = bikes.map((b, i) => {
    const from = acc / total * 360;
    acc += b.revenue;
    return `${bikeColor(b.name, i)} ${from}deg ${acc / total * 360}deg`;
  });
  return `
    <div class="db-donut-wrap">
      <div class="db-donut-circle">
        <div class="db-donut" style="background:${total ? `conic-gradient(${stops.join(', ')})` : '#3A3A3A'}"></div>
        <div class="db-donut-center"><b>${rub(total)}</b><span>выручка</span></div>
      </div>
      <div class="db-legend">
        ${bikes.map((b, i) => `
          <div class="db-legend-row">
            <span><i class="db-dot" style="background:${bikeColor(b.name, i)}"></i>${esc(b.name)}</span>
            <em>${rub(b.revenue)} · ${Math.round(b.revenue / total * 100)}%</em>
          </div>`).join('')}
      </div>
    </div>`;
}

function exportCsv(d) {
  const rows = [['Курьер', 'Выручка']].concat(d.couriers.map(c => [c.name, c.revenue]));
  const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'mobility_period.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function deskDashboard() {
  const d = await api('GET', `/api/admin/dashboard?from=${range.from}&to=${range.to}`);
  const maxDay = Math.max(...d.days, 1);
  const planPct = d.planTarget ? Math.round(d.profit / d.planTarget * 100) : 0;
  const hasBikes = d.bikes.length > 0;
  const showValues = d.days.length <= 14;
  const labelEvery = Math.max(1, Math.ceil(d.days.length / 12));

  deskShell('/dashboard', 'Дашборд', `
    <div class="db-kpis">
      ${kpi(icons.ruble, 'Прибыль', rub(d.profit))}
      ${kpi(icons.target, 'План', `${planPct} %`)}
      ${kpi(icons.wallet, 'Выручка', rub(d.revenue))}
      ${kpi(icons.box, 'Расходы', rub(d.expenses))}
      ${kpi(icons.bike, 'Нагрузка байков', `${d.load.toFixed(1)} %`)}
    </div>
    <div class="db-grid">
      <section class="db-card db-wide">
        <h2 class="db-title">Выручка за период</h2>
        <div class="db-bars">
          ${d.days.map((v, i) => `
            <div class="db-bar-col">
              ${showValues ? `<span class="db-bar-value">${Math.round(v).toLocaleString('ru-RU')}</span>` : ''}
              <div class="db-bar" style="height:${Math.max(3, v / maxDay * 100)}%" title="${rub(v)}"></div>
              <span class="db-bar-label">${i % labelEvery === 0 ? dayLabel(d.from, i, d.days.length) : ''}</span>
            </div>`).join('')}
        </div>
      </section>
      <section class="db-card">
        <h2 class="db-title">Курьерский рейтинг</h2>
        ${d.couriers.length ? `<ol class="db-rank">
          ${d.couriers.map((c, i) => `
            <li class="${i < 3 ? 'top' : ''}">
              <span><b>${i + 1}.</b>${esc(c.name.split(' ')[0])}</span>
              <em class="${c.revenue ? '' : 'zero'}">${rub(c.revenue)}</em>
            </li>`).join('')}
        </ol>` : '<div class="empty">Курьеров пока нет</div>'}
      </section>
      <section class="db-card">
        <h2 class="db-title">Топ байков</h2>
        ${hasBikes ? donut(d.bikes) : '<div class="empty">Завершённых аренд за период нет</div>'}
      </section>
    </div>`,
    `<div class="db-head-row">
      <input class="field d-date" id="range-from" type="date" value="${range.from}" aria-label="С какой даты">
      <span class="db-range-sep">—</span>
      <input class="field d-date" id="range-to" type="date" value="${range.to}" aria-label="По какую дату">
      <div class="head-actions db-head">
        <span class="refresh-note">${dateShort(d.from)} – ${dateShort(d.to)}</span>
        <button class="btn btn-outline d-small" id="dbExport">Экспорт CSV</button>
      </div>
    </div>`);

  document.getElementById('dbExport').onclick = () => exportCsv(d);

  const fromInput = document.getElementById('range-from');
  const toInput = document.getElementById('range-to');
  const applyRange = () => {
    if (!fromInput.value || !toInput.value) return;
    range = { from: fromInput.value, to: toInput.value };
    render();
  };
  fromInput.onchange = applyRange;
  toInput.onchange = applyRange;

  autoRefresh('/dashboard', deskDashboard);
}

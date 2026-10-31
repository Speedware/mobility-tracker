import { api } from '../../core/api.js';
import { esc, rub } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { deskShell, autoRefresh } from '../shell.js';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const BIKE_COLORS = {
  legend: '#F7D049', locomotive: '#E2574C', smart: '#57C78A', king: '#5AA9E6', uno: '#B980E0', u2: '#F2924A',
};
const FALLBACK_COLORS = ['#4DD0C4', '#E873A6', '#9CCC65', '#FFB74D', '#7986CB'];
const bikeColor = (name, i) => BIKE_COLORS[name.toLowerCase()] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

const dateShort = iso => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

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
  a.download = 'mobility_week.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function deskDashboard() {
  const d = await api('GET', '/api/admin/dashboard');
  const maxDay = Math.max(...d.days, 1);
  const planPct = d.planTarget ? Math.round(d.profit / d.planTarget * 100) : 0;
  const hasBikes = d.bikes.length > 0;

  deskShell('/dashboard', 'Дашборд', `
    <div class="db-kpis">
      ${kpi(icons.coins, 'Прибыль', rub(d.profit))}
      ${kpi(icons.target, 'План', `${planPct} %`, `Цель: ${rub(d.planTarget)}`)}
      ${kpi(icons.wallet, 'Выручка', rub(d.revenue))}
      ${kpi(icons.box, 'Расходы', rub(d.expenses))}
      ${kpi(icons.bike, 'Нагрузка байков', `${d.load.toFixed(1)} %`)}
    </div>
    <div class="db-grid">
      <section class="db-card db-wide">
        <h2 class="db-title">Выручка на неделе</h2>
        <div class="db-bars">
          ${d.days.map((v, i) => `
            <div class="db-bar-col">
              <span class="db-bar-value">${Math.round(v).toLocaleString('ru-RU')}</span>
              <div class="db-bar" style="height:${Math.max(3, v / maxDay * 100)}%"></div>
              <span class="db-bar-label">${DAYS[i]}</span>
            </div>`).join('')}
        </div>
      </section>
      <section class="db-card">
        <h2 class="db-title">Курьерский рейтинг</h2>
        ${d.couriers.length ? `<ol class="db-rank">
          ${d.couriers.map((c, i) => `
            <li class="${i < 3 ? 'top' : ''}">
              <span><b>${i + 1}.</b>${esc(c.name)}</span>
              <em class="${c.revenue ? '' : 'zero'}">${rub(c.revenue)}</em>
            </li>`).join('')}
        </ol>` : '<div class="empty">Курьеров пока нет</div>'}
      </section>
      <section class="db-card">
        <h2 class="db-title">Топ байков</h2>
        ${hasBikes ? donut(d.bikes) : '<div class="empty">Завершённых аренд на неделе нет</div>'}
      </section>
    </div>`,
    `<div class="head-actions db-head">
      <span class="refresh-note">Неделя ${dateShort(d.from)} – ${dateShort(d.to)}</span>
      <button class="btn btn-outline d-small" id="dbExport">Экспорт CSV</button>
    </div>`);

  document.getElementById('dbExport').onclick = () => exportCsv(d);
  autoRefresh('/dashboard', deskDashboard);
}

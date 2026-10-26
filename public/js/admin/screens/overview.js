import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, rub, since, between, fmtDate } from '../../core/format.js';
import { payTag, BIKE_AVAILABILITY } from '../../core/domain.js';
import { deskShell, autoRefresh } from '../shell.js';

const bikeTile = b => `
  <div class="d-bike ${b.busy ? 'busy' : ''} ${b.availability !== 'available' ? 'off' : ''}">
    <div class="d-bike-top">
      <img src="${b.image}" alt="">
      <div class="d-bike-title"><span class="name">${esc(b.name)}</span><span class="sub">Flex ${b.rate} ₽</span></div>
    </div>
    <div class="tags">
      ${b.busy ? '<span class="tag tag-busy">В аренде</span>' : '<span class="tag tag-free">Свободен</span>'}
      ${b.repairs.length ? '<span class="tag tag-repair">Ремонт</span>' : ''}
      ${b.availability !== 'available' ? `<span class="tag tag-rejected">${BIKE_AVAILABILITY[b.availability]}</span>` : ''}
    </div>
    ${b.rental ? `<div class="who"><span class="u">${esc(b.rental.userName)}</span><span class="t" data-since="${b.rental.startedAt}">${since(b.rental.startedAt)}</span></div>` : ''}
  </div>`;

const recentRow = r => `<tr>
  <td>${esc(r.userName)}<small>${fmtDate(r.startedAt)}</small></td>
  <td>${esc(r.bike)}</td>
  <td class="nowrap">${r.endedAt ? between(r.startedAt, r.endedAt)
    : `<span class="tag tag-busy">идёт</span><small data-since="${r.startedAt}">${since(r.startedAt)}</small>`}</td>
  <td class="num">${r.endedAt ? `${rub(r.total)}<small>${r.orders} зак.</small>` : '—'}</td>
  <td class="num">${r.endedAt ? payTag(r) : ''}</td>
</tr>`;

export async function deskOverview() {
  const data = await api('GET', '/api/admin/overview');
  const busy = data.bikes.filter(b => b.busy).length;
  state.openRepairs = data.bikes.reduce((n, b) => n + b.repairs.length, 0);

  deskShell('/', 'Обзор', `
    <div class="kpis">
      <div class="kpi"><span>Сейчас в аренде</span><b>${busy}</b></div>
      <div class="kpi ${state.openRepairs ? 'alert' : ''}"><span>Заявки на ремонт</span><b>${state.openRepairs}</b></div>
      <div class="kpi"><span>Выручка сегодня</span><b>${rub(data.today.revenue)}</b></div>
      <div class="kpi"><span>Выручка за месяц</span><b>${rub(data.month.revenue)}</b></div>
    </div>
    <div class="desk-cols">
      <section>
        <h2 class="desk-h2">Байки</h2>
        <div class="d-bikes">${data.bikes.map(bikeTile).join('')}</div>
      </section>
      <section>
        <h2 class="desk-h2">Последние аренды</h2>
        <div class="d-card">
          ${data.recent.length ? `<table class="d-table">
            <thead><tr><th>Курьер</th><th>Байк</th><th>Время</th><th class="num">Сумма</th><th class="num">Оплата</th></tr></thead>
            <tbody>${data.recent.map(recentRow).join('')}</tbody>
          </table>` : '<div class="empty">Аренд пока не было</div>'}
        </div>
      </section>
    </div>`,
    `<span class="refresh-note">Данные на ${new Date().toLocaleTimeString('ru-RU')}</span>`);

  autoRefresh('/', deskOverview);
}

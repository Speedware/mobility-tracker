import { $app, toast, confirmDialog, openModal, onSubmit } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, rub, since, between, fmtDate } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { PAY_STATUSES, counted, payTag } from '../../core/domain.js';
import { render } from '../../core/router.js';
import { deskShell } from '../shell.js';

let filter = 'all';
const FILTERS = [['all', 'Все'], ['pending', 'Ждут оплаты'], ['paid', 'Оплачено'], ['rejected', 'Отклонено']];
const sum = list => list.reduce((s, r) => s + r.total, 0);

const payCell = r => (r.endedAt && !r.closedByBlock
  ? `<select class="pay-select" data-pay="${r.id}" data-status="${r.payStatus}" aria-label="Статус оплаты">
      ${Object.entries(PAY_STATUSES).map(([k, v]) => `<option value="${k}" ${k === r.payStatus ? 'selected' : ''}>${v}</option>`).join('')}
    </select>`
  : payTag(r));

const row = r => `<tr class="${r.endedAt && r.payStatus === 'rejected' ? 'rejected' : ''}" data-q="${esc(`${r.userName} ${r.bike}`.toLowerCase())}">
  <td>${esc(r.userName)}</td>
  <td><b class="y">${esc(r.bike)}</b></td>
  <td class="nowrap">${fmtDate(r.startedAt)}</td>
  <td class="nowrap">${r.endedAt ? between(r.startedAt, r.endedAt) : `<span data-since="${r.startedAt}">${since(r.startedAt)}</span>`}</td>
  <td class="num">${r.endedAt ? r.orders : '—'}</td>
  <td class="num">Flex ${r.rate} ₽</td>
  <td class="num"><b>${r.endedAt ? rub(r.total) : '—'}</b></td>
  <td class="nowrap">${payCell(r)}</td>
  <td class="num nowrap">${r.endedAt ? `<button class="btn btn-outline d-small" data-edit="${r.id}">Изменить</button>` : ''}
    <button class="desk-icon-btn d-del" data-del="${r.id}" title="Удалить аренду" aria-label="Удалить аренду">${icons.trash}</button></td>
</tr>`;

export async function deskRentals() {
  const { rentals } = await api('GET', '/api/admin/rentals');
  const byStatus = st => rentals.filter(r => r.endedAt && r.payStatus === st);
  const list = filter === 'all' ? rentals : byStatus(filter);
  const pending = byStatus('pending');
  const byId = id => rentals.find(r => r.id === Number(id));

  deskShell('/rentals', 'Аренды', `
    <div class="kpis kpis-3">
      <div class="kpi"><span>Начислено всего</span><b>${rub(sum(rentals.filter(counted)))}</b></div>
      <div class="kpi ${pending.length ? 'alert' : ''}"><span>Ждёт оплаты</span><b>${rub(sum(pending))}</b></div>
      <div class="kpi"><span>Оплачено</span><b>${rub(sum(byStatus('paid')))}</b></div>
    </div>
    <div class="d-toolbar">
      <div class="seg">
        ${FILTERS.map(([k, v]) => `<button data-filter="${k}" ${filter === k ? 'aria-pressed="true"' : ''}>${v}</button>`).join('')}
      </div>
      <input class="field d-search" id="q" type="search" placeholder="Поиск по курьеру или байку">
    </div>
    <div class="d-card">
      ${list.length ? `<table class="d-table" id="rentals">
        <thead><tr><th>Курьер</th><th>Байк</th><th>Начало</th><th>Время</th><th class="num">Заказов</th><th class="num">Тариф</th><th class="num">Сумма</th><th>Оплата</th><th></th></tr></thead>
        <tbody>${list.map(row).join('')}</tbody>
      </table>` : '<div class="empty">Аренд нет</div>'}
    </div>`);

  $app.querySelectorAll('[data-filter]').forEach(el => { el.onclick = () => { filter = el.dataset.filter; render(); }; });
  $app.querySelectorAll('[data-edit]').forEach(el => { el.onclick = () => editRental(byId(el.dataset.edit)); });
  $app.querySelectorAll('[data-del]').forEach(el => { el.onclick = () => deleteRental(byId(el.dataset.del)); });

  $app.querySelectorAll('[data-pay]').forEach(el => {
    el.onchange = async () => {
      el.disabled = true;
      try {
        await api('PATCH', `/api/admin/rentals/${el.dataset.pay}`, { payStatus: el.value });
        toast(`Статус: ${PAY_STATUSES[el.value]}`);
        render();
      } catch (e) { toast(e.message, true); el.disabled = false; el.value = el.dataset.status; }
    };
  });

  document.getElementById('q').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    $app.querySelectorAll('#rentals tbody tr').forEach(tr => { tr.hidden = !!q && !tr.dataset.q.includes(q); });
  };
}

async function deleteRental(r) {
  if (!await confirmDialog({
    title: 'Удалить аренду?',
    text: `${r.userName}, ${r.bike}, ${fmtDate(r.startedAt)}.${r.endedAt ? '' : ' Аренда ещё идёт — байк освободится.'} Восстановить её будет нельзя.`,
    ok: 'Удалить', danger: true,
  })) return false;
  try {
    await api('DELETE', `/api/admin/rentals/${r.id}`);
    toast('Аренда удалена');
    render();
    return true;
  } catch (e) { toast(e.message, true); return false; }
}

function editRental(r) {
  let payStatus = r.payStatus;
  const { card, close } = openModal(`
    <form class="modal-card">
      <h2>Аренда · ${esc(r.bike)}</h2>
      <p class="modal-lead">${esc(r.userName)} · ${fmtDate(r.startedAt)} — ${fmtDate(r.endedAt)}</p>
      <div class="form">
        <div class="label">Количество заказов</div>
        <div class="stepper">
          <button type="button" class="key fn" data-step="-1" aria-label="Меньше">−</button>
          <input class="field" name="orders" type="number" inputmode="numeric" min="0" max="9999" value="${r.orders}">
          <button type="button" class="key fn" data-step="1" aria-label="Больше">+</button>
        </div>
        <div class="formula-row">Flex ${r.rate} ₽ × <span id="e-orders">${r.orders}</span> = <b id="e-total">${rub(r.total)}</b></div>
        <div class="label">Статус оплаты</div>
        <div class="seg seg-full">
          ${Object.entries(PAY_STATUSES).map(([k, v]) =>
            `<button type="button" data-paid="${k}" ${k === payStatus ? 'aria-pressed="true"' : ''}>${v}</button>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-close>Отмена</button>
        <button class="btn btn-primary" type="submit">Сохранить</button>
      </div>
      <button class="link-danger" type="button" id="m-delete">Удалить аренду</button>
    </form>`);

  const input = card.querySelector('[name=orders]');
  const update = () => {
    const n = Math.max(0, Math.min(9999, parseInt(input.value, 10) || 0));
    card.querySelector('#e-orders').textContent = n;
    card.querySelector('#e-total').textContent = rub(n * r.rate);
    return n;
  };
  input.oninput = update;
  input.select();
  card.querySelectorAll('[data-step]').forEach(el => {
    el.onclick = () => { input.value = Math.max(0, (parseInt(input.value, 10) || 0) + Number(el.dataset.step)); update(); };
  });
  card.querySelectorAll('[data-paid]').forEach(el => {
    el.onclick = () => {
      payStatus = el.dataset.paid;
      card.querySelectorAll('[data-paid]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
    };
  });
  card.querySelector('#m-delete').onclick = async () => { if (await deleteRental(r)) close(); };

  onSubmit(card, async () => {
    if (!/^\d+$/.test(input.value.trim())) throw new Error('Введите количество заказов');
    await api('PATCH', `/api/admin/rentals/${r.id}`, { orders: update(), payStatus });
    close();
    toast('Аренда обновлена');
    render();
  });
}

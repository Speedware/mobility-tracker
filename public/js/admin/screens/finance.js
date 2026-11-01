import { toast, openModal, onSubmit, confirmDialog } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, rub, fmtDate } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { render } from '../../core/router.js';
import { deskShell } from '../shell.js';

const sum = list => list.reduce((s, r) => s + r.amount, 0);

const fineRow = f => `<tr>
  <td class="nowrap">${fmtDate(f.createdAt)}</td>
  <td><b class="y">${esc(f.userName)}</b></td>
  <td class="num"><b>${rub(f.amount)}</b></td>
  <td class="wrap">${esc(f.comment)}</td>
  <td class="num"><button class="desk-icon-btn d-del" data-del-fine="${f.id}" title="Удалить штраф" aria-label="Удалить штраф">${icons.trash}</button></td>
</tr>`;

const expenseRow = e => `<tr>
  <td class="nowrap">${fmtDate(e.createdAt)}</td>
  <td class="num"><b>${rub(e.amount)}</b></td>
  <td class="wrap">${esc(e.comment)}</td>
  <td class="num"><button class="desk-icon-btn d-del" data-del-expense="${e.id}" title="Удалить расход" aria-label="Удалить расход">${icons.trash}</button></td>
</tr>`;

export async function deskFinance() {
  const [{ fines, expenses }, { couriers }] = await Promise.all([
    api('GET', '/api/admin/finance'),
    api('GET', '/api/admin/couriers'),
  ]);

  deskShell('/finance', 'Финансы', `
    <div class="kpis kpis-2">
      <div class="kpi"><span>Штрафов начислено</span><b>${rub(sum(fines))}</b></div>
      <div class="kpi"><span>Расходов всего</span><b>${rub(sum(expenses))}</b></div>
    </div>

    <section class="d-card-block">
      <h2 class="d-card-title">Штрафы курьерам</h2>
      <div class="d-card">
        ${fines.length ? `<table class="d-table">
          <thead><tr><th>Дата</th><th>Курьер</th><th class="num">Сумма</th><th>Комментарий</th><th></th></tr></thead>
          <tbody>${fines.map(fineRow).join('')}</tbody>
        </table>` : '<div class="empty">Штрафов пока не было</div>'}
      </div>
    </section>

    <section class="d-card-block">
      <h2 class="d-card-title">Расходы</h2>
      <div class="d-card">
        ${expenses.length ? `<table class="d-table">
          <thead><tr><th>Дата</th><th class="num">Сумма</th><th>Комментарий</th><th></th></tr></thead>
          <tbody>${expenses.map(expenseRow).join('')}</tbody>
        </table>` : '<div class="empty">Расходов пока не было</div>'}
      </div>
    </section>`,
    `<button class="btn btn-primary d-add" id="add-operation">${icons.plus}Добавить операцию</button>`);

  document.getElementById('add-operation').onclick = () => createOperation(couriers);

  document.querySelectorAll('[data-del-fine]').forEach(el => {
    el.onclick = async () => {
      const f = fines.find(x => x.id === Number(el.dataset.delFine));
      if (!await confirmDialog({
        title: 'Удалить штраф?', text: `${f.userName}, ${rub(f.amount)}, ${fmtDate(f.createdAt)}. Восстановить его будет нельзя.`,
        ok: 'Удалить', danger: true,
      })) return;
      try {
        await api('DELETE', `/api/admin/finance/fines/${f.id}`);
        toast('Штраф удалён');
        render();
      } catch (e) { toast(e.message, true); }
    };
  });

  document.querySelectorAll('[data-del-expense]').forEach(el => {
    el.onclick = async () => {
      const e = expenses.find(x => x.id === Number(el.dataset.delExpense));
      if (!await confirmDialog({
        title: 'Удалить расход?', text: `${rub(e.amount)}, ${fmtDate(e.createdAt)}. Восстановить его будет нельзя.`,
        ok: 'Удалить', danger: true,
      })) return;
      try {
        await api('DELETE', `/api/admin/finance/expenses/${e.id}`);
        toast('Расход удалён');
        render();
      } catch (ex) { toast(ex.message, true); }
    };
  });
}

function createOperation(couriers) {
  let type = 'fine';
  const { card, close } = openModal(`
    <form class="modal-card">
      <h2>Новая операция</h2>
      <div class="seg seg-full">
        <button type="button" data-type="fine" aria-pressed="true">Штраф</button>
        <button type="button" data-type="expense" aria-pressed="false">Расход</button>
      </div>
      <div class="form">
        <select class="field" name="userId" data-courier>
          ${couriers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
        <input class="field" name="amount" type="number" inputmode="numeric" min="1" max="1000000" placeholder="Сумма, ₽">
        <textarea class="field" name="comment" placeholder="Комментарий" maxlength="300"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-close>Отмена</button>
        <button class="btn btn-primary" type="submit">Добавить</button>
      </div>
    </form>`);
  const courierField = card.querySelector('[data-courier]');
  card.querySelectorAll('[data-type]').forEach(el => {
    el.onclick = () => {
      type = el.dataset.type;
      card.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      courierField.hidden = type !== 'fine';
    };
  });
  card.querySelector('[name=amount]').focus();

  onSubmit(card, async data => {
    if (!data.comment.trim()) throw new Error(type === 'fine' ? 'Укажите, за что штраф' : 'Укажите статью расхода');
    await api('POST', `/api/admin/finance/${type === 'fine' ? 'fines' : 'expenses'}`, data);
    close();
    toast(type === 'fine' ? 'Штраф начислен' : 'Расход добавлен');
    render();
  });
}

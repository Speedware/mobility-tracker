import { $app, toast, confirmDialog } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, fmtDate } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { partTags } from '../../core/domain.js';
import { render } from '../../core/router.js';
import { deskShell, autoRefresh } from '../shell.js';

let filter = 'open';

const row = r => `<tr>
  <td class="date">${fmtDate(r.createdAt)}</td>
  <td><b class="y">${esc(r.bike)}</b></td>
  <td><div class="parts">${partTags(r.parts)}</div></td>
  <td class="wrap">${esc(r.comment || '—')}</td>
  <td>${esc(r.userName)}</td>
  <td class="nowrap">${r.resolvedAt
    ? `<span class="tag tag-free">Закрыта</span><small>${fmtDate(r.resolvedAt)}</small>`
    : `<button class="btn btn-outline d-small" data-resolve="${r.id}">Отремонтировано</button>`}</td>
  <td class="num"><button class="desk-icon-btn d-del" data-del="${r.id}" title="Удалить заявку" aria-label="Удалить заявку">${icons.trash}</button></td>
</tr>`;

export async function deskRepairs() {
  const { repairs } = await api('GET', '/api/admin/repairs');
  state.openRepairs = repairs.filter(r => !r.resolvedAt).length;
  const list = filter === 'open' ? repairs.filter(r => !r.resolvedAt) : repairs;

  deskShell('/repairs', 'Заявки на ремонт', `
    <div class="d-card">
      ${list.length ? `<table class="d-table">
        <thead><tr><th>Дата</th><th>Байк</th><th>Что сломалось</th><th>Комментарий</th><th>Курьер</th><th>Статус</th><th></th></tr></thead>
        <tbody>${list.map(row).join('')}</tbody>
      </table>` : `<div class="empty">${filter === 'open' ? 'Открытых заявок нет' : 'Заявок пока не было'}</div>`}
    </div>`,
    `<div class="seg">
      <button data-filter="open" ${filter === 'open' ? 'aria-pressed="true"' : ''}>Открытые</button>
      <button data-filter="all" ${filter === 'all' ? 'aria-pressed="true"' : ''}>Все</button>
    </div>`);

  $app.querySelectorAll('[data-filter]').forEach(el => { el.onclick = () => { filter = el.dataset.filter; render(); }; });

  $app.querySelectorAll('[data-resolve]').forEach(el => {
    el.onclick = async () => {
      el.disabled = true;
      try {
        await api('POST', `/api/admin/repairs/${el.dataset.resolve}/resolve`);
        toast('Заявка закрыта');
        render();
      } catch (e) { toast(e.message, true); el.disabled = false; }
    };
  });

  $app.querySelectorAll('[data-del]').forEach(el => {
    el.onclick = async () => {
      const r = repairs.find(x => x.id === Number(el.dataset.del));
      if (!await confirmDialog({
        title: 'Удалить заявку?', text: `${r.bike}, ${r.userName}, ${fmtDate(r.createdAt)}. Восстановить её будет нельзя.`,
        ok: 'Удалить', danger: true,
      })) return;
      try {
        await api('DELETE', `/api/admin/repairs/${r.id}`);
        toast('Заявка удалена');
        render();
      } catch (e) { toast(e.message, true); }
    };
  });

  autoRefresh('/repairs', deskRepairs);
}

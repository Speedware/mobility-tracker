import { $app } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, rub, since, between, fmtShort } from '../../core/format.js';
import { counted, payTag, payStatusTag } from '../../core/domain.js';
import { tabbar } from '../tabbar.js';

const item = r => `
  <div class="h-item">
    <div>
      <div class="bike">${esc(r.bike)}</div>
      <div class="meta">${fmtShort(r.startedAt)}${r.endedAt ? ` - ${fmtShort(r.endedAt)}` : ''}<br>
        ${r.endedAt ? `Время ${between(r.startedAt, r.endedAt)}` : `Идёт · <span data-since="${r.startedAt}">${since(r.startedAt)}</span>`}</div>
    </div>
    <div class="sum">${r.endedAt ? rub(r.total) : '—'}
      <small>${r.endedAt ? `${r.orders} зак. × ${r.rate} ₽` : 'активна'}</small>
      ${r.endedAt ? payTag(r) : ''}</div>
  </div>`;

const fineItem = f => `
  <div class="h-item h-fine">
    <div>
      <div class="bike">Штраф</div>
      <div class="meta">${fmtShort(f.createdAt)}<br>${esc(f.comment)}</div>
    </div>
    <div class="sum">${rub(f.amount)}<div>${payStatusTag(f.payStatus)}</div></div>
  </div>`;

export async function screenHistory() {
  const { rentals, fines } = await api('GET', '/api/rentals');
  const done = rentals.filter(counted);
  const toPay = rentals.filter(r => r.endedAt && r.payStatus === 'pending').reduce((s, r) => s + r.total, 0);

  const timeline = [
    ...rentals.map(r => ({ date: r.startedAt, html: item(r) })),
    ...fines.map(f => ({ date: f.createdAt, html: fineItem(f) })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  $app.innerHTML = `
    <section class="screen yellow-top with-tabs">
      <div class="top"><h1>История</h1></div>
      <div class="sheet">
        <div class="stats">
          <div class="stat"><b>${done.length}</b><span>аренда</span></div>
          <div class="stat"><b>${done.reduce((s, r) => s + r.orders, 0)}</b><span>заказы</span></div>
          <div class="stat"><b>${rub(toPay)}</b><span>оплатить</span></div>
        </div>
        <div class="history">
          ${timeline.length ? timeline.map(t => t.html).join('') : '<div class="empty">Пока нет ни одной аренды</div>'}
        </div>
        <p class="history-note">Данные за последние 30 дней</p>
      </div>
      ${tabbar('/history')}
    </section>`;
}

import { $app, toast } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, rub } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { BIKE_AVAILABILITY } from '../../core/domain.js';
import { render, url } from '../../core/router.js';
import { deskShell, avatarHtml } from '../shell.js';
import { editCourier } from './couriers.js';

const ratingPicker = rating => `
  <div class="rating-pick" role="group" aria-label="Рейтинг">
    ${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
      `<button type="button" data-rating="${n}" aria-pressed="${n === rating}">${n}</button>`).join('')}
  </div>`;

const bikeRow = b => `<tr class="${b.hidden ? 'blocked' : ''}" data-bike="${b.id}">
  <td><div class="d-person"><img class="d-thumb" src="${b.image}" alt=""><div><b class="y">${esc(b.name)}</b>${b.availability !== 'available'
    ? `<small>${BIKE_AVAILABILITY[b.availability]} для всех</small>` : ''}</div></div></td>
  <td class="num">Flex ${b.baseRate} ₽</td>
  <td class="num nowrap">
    <label class="rate-field ${b.rate !== null ? 'custom' : ''}">
      <input class="field" type="number" inputmode="numeric" min="1" max="10000" data-rate placeholder="${b.baseRate}" value="${b.rate ?? ''}" aria-label="Цена ${esc(b.name)} для курьера">
      <span>₽</span>
    </label>
  </td>
  <td class="num">
    <label class="switch-hit"><input type="checkbox" class="switch" data-visible ${b.hidden ? '' : 'checked'} aria-label="Показывать ${esc(b.name)} курьеру"></label>
  </td>
</tr>`;

export async function deskCourier(id) {
  const { courier: c, bikes } = await api('GET', `/api/admin/couriers/${id}`);

  deskShell('/couriers', 'Профиль курьера', `
    <div class="profile-head">
      <div class="d-person">${avatarHtml(c)}<div><b>${esc(c.name)}</b><small>${esc(c.email)} · в системе с ${new Date(c.createdAt).toLocaleDateString('ru-RU')}</small></div></div>
      ${c.blocked ? '<span class="tag tag-repair">Заблокирован</span>' : ''}
    </div>
    <div class="kpis">
      <div class="kpi"><span>Аренд</span><b>${c.rentals}</b></div>
      <div class="kpi"><span>Заказов</span><b>${c.orders}</b></div>
      <div class="kpi"><span>Начислено</span><b>${rub(c.revenue)}</b></div>
      <div class="kpi ${c.unpaid ? 'alert' : ''}"><span>К оплате</span><b>${rub(c.unpaid)}</b></div>
    </div>
    <div class="desk-cols">
      <section>
        <h2 class="desk-h2">Рейтинг <span class="d-rating big">${c.rating ? `${c.rating}${icons.star}` : '—'}</span></h2>
        <div class="d-card d-pad rating-card">
          ${ratingPicker(c.rating)}
          ${c.rating ? '<button type="button" class="link-btn" id="rating-reset">Сбросить</button>' : ''}
        </div>
      </section>
      <section>
        <h2 class="desk-h2">Цены и доступ к байкам</h2>
        <div class="d-card">
          <table class="d-table">
            <thead><tr><th>Байк</th><th class="num">Базовая цена</th><th class="num">Цена для курьера</th><th class="num">Показывать</th></tr></thead>
            <tbody>${bikes.map(bikeRow).join('')}</tbody>
          </table>
        </div>
      </section>
    </div>`,
    `<div class="head-actions">
      <a class="btn btn-outline d-small" href="${url('/couriers')}">Все курьеры</a>
      <button class="btn btn-primary d-small" id="edit">Изменить</button>
    </div>`);

  document.getElementById('edit').onclick = () => editCourier(c);

  const setRating = async rating => {
    try {
      await api('PATCH', `/api/admin/couriers/${c.id}`, { rating });
      toast(rating ? `Рейтинг: ${rating} из 10` : 'Рейтинг сброшен');
      render();
    } catch (e) { toast(e.message, true); }
  };
  $app.querySelectorAll('[data-rating]').forEach(el => {
    el.onclick = () => setRating(Number(el.dataset.rating));
  });
  document.getElementById('rating-reset')?.addEventListener('click', () => setRating(null));

  $app.querySelectorAll('[data-bike]').forEach(row => {
    const bike = bikes.find(b => b.id === Number(row.dataset.bike));
    const input = row.querySelector('[data-rate]');
    const visible = row.querySelector('[data-visible]');
    const save = async () => {
      const raw = input.value.trim();
      const rate = raw === '' ? null : Number(raw);
      try {
        await api('PUT', `/api/admin/couriers/${c.id}/bikes/${bike.id}`, { rate, hidden: !visible.checked });
        bike.rate = rate;
        bike.hidden = !visible.checked;
        row.classList.toggle('blocked', bike.hidden);
        input.closest('.rate-field').classList.toggle('custom', rate !== null);
        return true;
      } catch (e) {
        toast(e.message, true);
        input.value = bike.rate ?? '';
        visible.checked = !bike.hidden;
        return false;
      }
    };
    input.addEventListener('change', async () => {
      if (input.value.trim() === String(bike.rate ?? '')) return;
      if (await save()) toast(input.value.trim() ? `${bike.name}: ${input.value.trim()} ₽` : `${bike.name}: базовая цена`);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    visible.addEventListener('change', async () => {
      if (await save()) toast(`${bike.name}: ${visible.checked ? 'виден курьеру' : 'скрыт от курьера'}`);
    });
  });
}

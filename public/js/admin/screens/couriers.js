import { $app, toast, openModal, onSubmit, resizeImage } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, rub, fmtDate, initialsOf } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { render } from '../../core/router.js';
import { deskShell, avatarHtml } from '../shell.js';

const row = c => `<tr class="${c.blocked ? 'blocked' : ''}">
  <td><div class="d-person">${avatarHtml(c)}<div>${esc(c.name)}<small>${esc(c.email)}</small></div></div></td>
  <td>${c.blocked ? '<span class="tag tag-repair">Заблокирован</span>'
    : c.activeBike ? `<span class="tag tag-busy">${esc(c.activeBike)}</span>` : '<span class="muted">—</span>'}</td>
  <td class="num">${c.rentals}</td>
  <td class="num">${c.orders}</td>
  <td class="num"><b>${rub(c.revenue)}</b></td>
  <td class="num">${c.unpaid ? `<b class="warn">${rub(c.unpaid)}</b>` : '<span class="muted">—</span>'}</td>
  <td class="nowrap">${c.lastRentalAt ? fmtDate(c.lastRentalAt) : '—'}</td>
  <td class="nowrap">${new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
  <td class="num"><button class="btn btn-outline d-small" data-edit="${c.id}">Изменить</button></td>
</tr>`;

export async function deskCouriers() {
  const { couriers } = await api('GET', '/api/admin/couriers');

  deskShell('/couriers', 'Курьеры', `
    <div class="d-card">
      ${couriers.length ? `<table class="d-table">
        <thead><tr><th>Курьер</th><th>Сейчас</th><th class="num">Аренд</th><th class="num">Заказов</th><th class="num">Начислено</th><th class="num">К оплате</th><th>Последняя аренда</th><th>В системе с</th><th></th></tr></thead>
        <tbody>${couriers.map(row).join('')}</tbody>
      </table>` : '<div class="empty">Курьеров пока нет</div>'}
    </div>`,
    `<button class="btn btn-primary d-add" id="add-courier">${icons.plus}Добавить курьера</button>`);

  document.getElementById('add-courier').onclick = createCourier;
  $app.querySelectorAll('[data-edit]').forEach(el => {
    el.onclick = () => editCourier(couriers.find(c => c.id === Number(el.dataset.edit)));
  });
}

function bindPhotoPicker(card, onPhoto) {
  const input = card.querySelector('[data-photo-input]');
  const ava = card.querySelector('[data-photo]');
  ava.onclick = () => input.click();
  input.onchange = async () => {
    if (!input.files[0]) return;
    try {
      const photo = await resizeImage(input.files[0]);
      ava.style.backgroundImage = `url('${photo}')`;
      ava.querySelector('[data-placeholder]')?.remove();
      onPhoto(photo);
    } catch (e) { toast(e.message, true); }
  };
}

function createCourier() {
  let photo = null;
  const { card, close } = openModal(`
    <form class="modal-card">
      <h2>Новый курьер</h2>
      <div class="avatar-wrap">
        <button class="avatar" type="button" data-photo aria-label="Добавить фото"><span data-placeholder>${icons.user}</span><span class="cam">${icons.camera}</span></button>
        <div class="who"><span>Фото — по желанию</span></div>
        <input type="file" data-photo-input accept="image/*" hidden>
      </div>
      <div class="form">
        <input class="field" name="name" placeholder="ФИО" autocomplete="off">
        <input class="field" name="email" type="email" placeholder="Почта" autocomplete="off">
        <input class="field" name="password" type="text" placeholder="Пароль (от 6 символов)" autocomplete="new-password">
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-close>Отмена</button>
        <button class="btn btn-primary" type="submit">Создать</button>
      </div>
    </form>`);
  card.querySelector('[name=name]').focus();
  bindPhotoPicker(card, p => { photo = p; });

  onSubmit(card, async data => {
    await api('POST', '/api/admin/couriers', { ...data, photo });
    close();
    toast('Аккаунт курьера создан');
    render();
  });
}

function editCourier(c) {
  let photo;
  const { card, close } = openModal(`
    <form class="modal-card">
      <h2>Курьер</h2>
      <div class="avatar-wrap">
        <button class="avatar" type="button" data-photo aria-label="Изменить фото" style="${c.photo ? `background-image:url('${c.photo}')` : ''}">
          ${c.photo ? '' : `<span data-placeholder>${esc(initialsOf(c.name))}</span>`}<span class="cam">${icons.camera}</span>
        </button>
        <div class="who"><b>${esc(c.name)}</b><span>${esc(c.email)}</span></div>
        <input type="file" data-photo-input accept="image/*" hidden>
      </div>
      <div class="form">
        <div class="label">ФИО</div>
        <input class="field" name="name" value="${esc(c.name)}">
        <div class="label">Новый пароль</div>
        <input class="field" name="password" type="password" placeholder="Оставьте пустым, чтобы не менять" autocomplete="new-password">
        <div class="switch-row">
          <span><b>Заблокировать учётную запись</b><small>Курьер не сможет войти, активная аренда закроется с оплатой 0 ₽</small></span>
          <label class="switch-hit"><input type="checkbox" class="switch" name="blocked" aria-label="Заблокировать учётную запись" ${c.blocked ? 'checked' : ''}></label>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-close>Отмена</button>
        <button class="btn btn-primary" type="submit">Сохранить</button>
      </div>
    </form>`);
  card.querySelector('[name=name]').focus();
  bindPhotoPicker(card, p => { photo = p; });

  onSubmit(card, async data => {
    const body = { name: data.name, blocked: !!data.blocked };
    if (data.password) body.password = data.password;
    if (photo) body.photo = photo;
    await api('PATCH', `/api/admin/couriers/${c.id}`, body);
    close();
    toast(body.blocked && !c.blocked ? 'Учётная запись заблокирована' : 'Данные курьера сохранены');
    render();
  });
}

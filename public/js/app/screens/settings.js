import { $app, toast, confirmDialog, onSubmit, resizeImage } from '../../core/ui.js';
import { api, logout } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, initialsOf } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { render } from '../../core/router.js';
import { tabbar } from '../tabbar.js';

export async function screenSettings() {
  state.me = (await api('GET', '/api/me')).user;
  const me = state.me;

  $app.innerHTML = `
    <section class="screen yellow-top with-tabs">
      <div class="top"><h1>Настройки</h1></div>
      <div class="sheet">
        <div class="avatar-wrap">
          <button class="avatar" id="avatar" aria-label="Изменить фото" style="${me.photo ? `background-image:url('${me.photo}')` : ''}">
            ${me.photo ? '' : esc(initialsOf(me.name))}<span class="cam">${icons.camera}</span>
          </button>
          <div class="who">
            <b>${esc(me.name)}</b><span>${esc(me.email)}</span>
            ${me.rating ? `<div class="rating-badge" aria-label="Рейтинг ${me.rating} из 10">${me.rating}${icons.star}</div>` : ''}
          </div>
          <input type="file" id="photo" accept="image/*" hidden>
        </div>

        <div class="section">
          <h2>Данные профиля</h2>
          <form class="form" id="profile">
            <div class="label">ФИО</div>
            <input class="field" name="name" value="${esc(me.name)}" autocomplete="name">
            <div class="label">Почта</div>
            <input class="field" name="email" type="email" value="${esc(me.email)}" autocomplete="email">
            <button class="btn btn-primary" type="submit">Сохранить</button>
          </form>
        </div>

        <div class="section">
          <h2>Сброс пароля</h2>
          <form class="form" id="password">
            <input class="field" name="current" type="password" placeholder="Текущий пароль" autocomplete="current-password">
            <input class="field" name="next" type="password" placeholder="Новый пароль (от 6 символов)" autocomplete="new-password">
            <input class="field" name="repeat" type="password" placeholder="Повторите новый пароль" autocomplete="new-password">
            <button class="btn btn-outline" type="submit">Сменить пароль</button>
          </form>
        </div>

        <button class="btn btn-logout" id="logout">${icons.logout}Выйти из аккаунта</button>
      </div>
      ${tabbar('/settings')}
    </section>`;

  document.getElementById('logout').onclick = async () => {
    if (await confirmDialog({ title: 'Выйти из аккаунта?', ok: 'Выйти', danger: true })) logout();
  };

  const fileInput = document.getElementById('photo');
  document.getElementById('avatar').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    if (!fileInput.files[0]) return;
    try {
      const photo = await resizeImage(fileInput.files[0]);
      state.me = (await api('PATCH', '/api/me', { photo })).user;
      toast('Фото обновлено');
      render();
    } catch (e) { toast(e.message || 'Не удалось загрузить фото', true); }
  };

  onSubmit(document.getElementById('profile'), async data => {
    state.me = (await api('PATCH', '/api/me', data)).user;
    toast('Профиль сохранён');
    render();
  });

  const pwForm = document.getElementById('password');
  onSubmit(pwForm, async ({ current, next, repeat }) => {
    if (next !== repeat) throw new Error('Новые пароли не совпадают');
    await api('POST', '/api/me/password', { current, next });
    pwForm.reset();
    toast('Пароль изменён');
  });
}

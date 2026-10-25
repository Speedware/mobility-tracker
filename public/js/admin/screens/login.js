import { $app, onSubmit } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc } from '../../core/format.js';
import { goHome } from '../../core/router.js';

export function deskLogin() {
  const other = state.me && !state.me.isAdmin;
  $app.innerHTML = `
    <div class="desk-login">
      <form class="login-card" id="auth">
        <img src="/assets/brand/logo-white.svg" alt="Мобилити">
        <h1>Панель управления</h1>
        ${other ? `<p class="login-note">Вы вошли как ${esc(state.me.name)} — у этой учётной записи нет доступа к панели.</p>` : ''}
        <input class="field" name="email" type="email" placeholder="Почта администратора" autocomplete="email">
        <input class="field" name="password" type="password" placeholder="Пароль" autocomplete="current-password">
        <button class="btn btn-primary" type="submit">Войти</button>
        <a class="login-link" href="/app">Перейти в приложение курьера</a>
      </form>
    </div>`;
  const form = document.getElementById('auth');
  form.querySelector('[name=email]').focus();
  onSubmit(form, async data => {
    state.me = (await api('POST', '/api/login', { ...data, admin: true })).user;
    goHome();
  });
}

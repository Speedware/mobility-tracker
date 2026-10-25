import { $app, onSubmit } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { go, url } from '../../core/router.js';

export function screenWelcome() {
  $app.innerHTML = `
    <section class="screen welcome">
      <div class="brand">
        <img src="/assets/brand/logo-black.svg" alt="Мобилити">
        <p>На чём едем сегодня?</p>
      </div>
      <div class="hero"><img src="/assets/bikes/uno.png" alt=""></div>
      <div class="actions">
        <a class="btn btn-primary" href="${url('/login')}">Войти</a>
        ${state.registrationOpen
          ? `<a class="btn btn-outline" href="${url('/register')}">Зарегистрироваться</a>`
          : '<p class="closed-note">Регистрация новых курьеров сейчас закрыта</p>'}
      </div>
    </section>`;
}

function authScreen(title, fields, submit) {
  $app.innerHTML = `
    <section class="screen">
      <div class="top"><h1>${title}</h1></div>
      <form class="form" id="auth">${fields}</form>
      <div class="actions">
        <button class="btn btn-primary" type="submit" form="auth">Продолжить</button>
        <a class="btn btn-outline" href="${url('/welcome')}">Назад</a>
      </div>
    </section>`;
  const form = document.getElementById('auth');
  form.querySelector('input').focus();
  onSubmit(form, submit);
}

export function screenLogin() {
  authScreen('Вход в аккаунт', `
    <input class="field" name="email" type="email" placeholder="Почта" autocomplete="email">
    <input class="field" name="password" type="password" placeholder="Пароль" autocomplete="current-password">
  `, async data => signedIn((await api('POST', '/api/login', data)).user));
}

export function screenRegister() {
  if (!state.registrationOpen) return go('/welcome', { replace: true });
  authScreen('Регистрация', `
    <input class="field" name="name" placeholder="ФИО" autocomplete="name">
    <input class="field" name="email" type="email" placeholder="Почта" autocomplete="email">
    <input class="field" name="password" type="password" placeholder="Пароль" autocomplete="new-password">
  `, async data => signedIn((await api('POST', '/api/register', data)).user));
}

async function signedIn(user) {
  state.me = user;
  state.activeRental = (await api('GET', '/api/me')).activeRental;
  go(state.activeRental ? `/bike/${state.activeRental.bikeId}` : '/bikes', { replace: true });
}

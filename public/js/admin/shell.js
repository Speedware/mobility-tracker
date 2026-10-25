import { $app, hasOpenModal } from '../core/ui.js';
import { logout } from '../core/api.js';
import { state } from '../core/state.js';
import { esc, initialsOf } from '../core/format.js';
import { icons } from '../core/icons.js';
import { url, currentPath, onLeave } from '../core/router.js';

const NAV = [
  { path: '/', label: 'Обзор', icon: icons.panel },
  { path: '/repairs', label: 'Ремонт', icon: icons.wrench, badge: () => state.openRepairs },
  { path: '/rentals', label: 'Аренды', icon: icons.history },
  { path: '/couriers', label: 'Курьеры', icon: icons.users },
  { path: '/settings', label: 'Настройки', icon: icons.settings },
];

export const avatarHtml = u =>
  `<span class="d-ava" style="${u.photo ? `background-image:url('${u.photo}')` : ''}">${u.photo ? '' : esc(initialsOf(u.name))}</span>`;

export function deskShell(current, title, content, headExtra = '') {
  $app.innerHTML = `
    <div class="desk">
      <button class="desk-burger" id="burger" aria-label="Меню" aria-expanded="false">${icons.burger}</button>
      <div class="desk-scrim" id="scrim"></div>
      <aside class="desk-side">
        <img class="desk-logo" src="/assets/brand/logo-white.svg" alt="Мобилити">
        <nav class="desk-nav">
          ${NAV.map(n => {
            const badge = n.badge?.();
            return `<a href="${url(n.path)}" ${n.path === current ? 'aria-current="page"' : ''}>
              ${n.icon}<span>${n.label}</span>${badge ? `<em>${badge}</em>` : ''}</a>`;
          }).join('')}
        </nav>
        <div class="desk-user">
          ${avatarHtml(state.me)}
          <div><b>${esc(state.me.name)}</b><span>Владелец</span></div>
          <button class="desk-icon-btn" id="logout" title="Выйти" aria-label="Выйти">${icons.logout}</button>
        </div>
      </aside>
      <main class="desk-main">
        <header class="desk-head"><h1>${title}</h1>${headExtra}</header>
        ${content}
      </main>
    </div>`;

  document.getElementById('logout').onclick = logout;
  const desk = $app.querySelector('.desk');
  const burger = document.getElementById('burger');
  const toggle = open => { desk.classList.toggle('nav-open', open); burger.setAttribute('aria-expanded', String(open)); };
  burger.onclick = () => toggle(!desk.classList.contains('nav-open'));
  document.getElementById('scrim').onclick = () => toggle(false);
}

export function autoRefresh(path, screen) {
  const timer = setInterval(async () => {
    if (currentPath() !== path || hasOpenModal()) return;
    const y = window.scrollY;
    clearInterval(timer);
    await screen().catch(() => {});
    window.scrollTo(0, y);
  }, 15000);
  onLeave(() => clearInterval(timer));
}

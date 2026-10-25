import { icons } from '../core/icons.js';
import { url } from '../core/router.js';

const TABS = [
  { path: '/bikes', label: 'Байк', icon: icons.bike },
  { path: '/history', label: 'История', icon: icons.history },
  { path: '/settings', label: 'Настройки', icon: icons.settings },
];

let lastTab = 0;

export function tabbar(current) {
  const i = Math.max(0, TABS.findIndex(t => t.path === current));
  const from = lastTab;
  lastTab = i;
  return `<nav class="tabbar" style="--n:${TABS.length}">
    <span class="tab-indicator" style="--i:${from}" data-to="${i}"></span>${TABS.map(t => `
    <a href="${url(t.path)}" ${t.path === current ? 'aria-current="page"' : ''}>${t.icon}<span>${t.label}</span></a>`).join('')}</nav>`;
}

export function slideTabIndicator() {
  const ind = document.querySelector('.tab-indicator');
  if (ind) requestAnimationFrame(() => requestAnimationFrame(() => ind.style.setProperty('--i', ind.dataset.to)));
}

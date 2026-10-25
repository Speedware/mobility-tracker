import { $app, startLoading, stopLoading, toast, closeAllModals } from './ui.js';
import { state } from './state.js';

let cfg = null;
let lastPath = null;
let cleanups = [];
let renderSeq = 0;

export const url = path => cfg.base + (path === '/' ? '' : path);

export function currentPath() {
  const p = location.pathname.slice(cfg.base.length).replace(/\/+$/, '');
  return p || '/';
}

export function go(path, { replace = false } = {}) {
  const target = url(path);
  if (location.pathname !== target) history[replace ? 'replaceState' : 'pushState'](null, '', target);
  return render();
}

export const goHome = () => go(cfg.home, { replace: true });
export const goLogin = () => go(cfg.login, { replace: true });

export const onLeave = fn => cleanups.push(fn);
export function leaveScreen() {
  cleanups.forEach(fn => fn());
  cleanups = [];
  closeAllModals();
}

export async function render() {
  const seq = ++renderSeq;
  leaveScreen();
  const path = currentPath();
  const match = cfg.routes.map(([re, fn, opts]) => [re.exec(path), fn, opts || {}]).find(([m]) => m);
  const ok = cfg.authorized();
  if (!match) return ok ? goHome() : goLogin();
  const [m, screen, opts] = match;
  if (!opts.guest && !ok) return goLogin();
  if (opts.guest && ok) return goHome();

  startLoading();
  try {
    await screen(...m.slice(1));
  } catch (e) {
    if (state.me) toast(e.message, true);
  } finally {
    stopLoading();
  }
  if (seq !== renderSeq) return;
  if (path !== lastPath) $app.firstElementChild?.classList.add('page-enter');
  lastPath = path;
  cfg.afterRender?.();
  window.scrollTo(0, 0);
}

export function startRouter(config) {
  cfg = config;
  if (location.hash.startsWith('#/')) history.replaceState(null, '', url(location.hash.slice(1)));

  addEventListener('popstate', render);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href');
    if (href !== cfg.base && !href.startsWith(`${cfg.base}/`)) return;
    e.preventDefault();
    if (href !== location.pathname) history.pushState(null, '', href);
    render();
  });
}

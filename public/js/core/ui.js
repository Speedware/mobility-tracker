import { icons, BOLT_SVG } from './icons.js';
import { since } from './format.js';

export const $app = document.getElementById('app');

const toastEl = document.getElementById('toast');
let toastTimer;
toastEl.addEventListener('click', () => toastEl.classList.remove('show'));

export function toast(msg, isError = false) {
  toastEl.innerHTML = `<span class="toast-ic">${isError ? icons.alert : icons.check}</span><span class="toast-msg"></span>`;
  toastEl.querySelector('.toast-msg').textContent = msg;
  toastEl.className = isError ? 'error' : '';
  toastEl.setAttribute('role', isError ? 'alert' : 'status');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), isError ? 4000 : 2800);
}

const openModals = new Set();
export const closeAllModals = () => [...openModals].forEach(close => close());
export const hasOpenModal = () => openModals.size > 0;

export function openModal(cardHtml, { onClose } = {}) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = cardHtml;
  document.body.appendChild(modal);
  const onKey = e => { if (e.key === 'Escape') close(); };
  function close() {
    if (!modal.isConnected) return;
    modal.remove();
    openModals.delete(close);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  }
  openModals.add(close);
  document.addEventListener('keydown', onKey);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) close();
  });
  return { modal, card: modal.firstElementChild, close };
}

export function confirmDialog({ title, text = '', ok = 'Да', cancel = 'Отмена', danger = false }) {
  return new Promise(resolve => {
    let result = false;
    const { card, close } = openModal(`
      <div class="modal-card confirm-card" role="alertdialog" aria-modal="true">
        <h2></h2>
        ${text ? '<p class="modal-lead"></p>' : ''}
        <div class="modal-actions">
          <button class="btn btn-outline" type="button" data-close>${cancel}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-ok>${ok}</button>
        </div>
      </div>`, { onClose: () => resolve(result) });
    card.querySelector('h2').textContent = title;
    if (text) card.querySelector('.modal-lead').textContent = text;
    const okBtn = card.querySelector('[data-ok]');
    okBtn.onclick = () => { result = true; close(); };
    okBtn.focus();
  });
}

let loaderEl, loaderTimer, loading = 0;

export function startLoading() {
  loading++;
  clearTimeout(loaderTimer);
  loaderTimer = setTimeout(() => {
    if (!loaderEl) {
      loaderEl = document.createElement('div');
      loaderEl.className = 'loader overlay';
      loaderEl.setAttribute('role', 'progressbar');
      loaderEl.setAttribute('aria-label', 'Загрузка');
      loaderEl.innerHTML = BOLT_SVG;
      document.body.appendChild(loaderEl);
    }
    loaderEl.classList.add('on');
  }, 220);
}

export function stopLoading() {
  loading = Math.max(0, loading - 1);
  if (loading) return;
  clearTimeout(loaderTimer);
  loaderEl?.classList.remove('on');
}

export function onSubmit(form, handler) {
  form.noValidate = true;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]') || document.querySelector(`[form="${form.id}"]`);
    if (btn) btn.disabled = true;
    try {
      await handler(Object.fromEntries(new FormData(form)));
    } catch (ex) {
      toast(ex.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

export function resizeImage(file, size = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    img.src = URL.createObjectURL(file);
  });
}

setInterval(() => {
  document.querySelectorAll('[data-since]').forEach(el => { el.textContent = since(el.dataset.since); });
}, 1000);

window.mobility = { startLoading, stopLoading };

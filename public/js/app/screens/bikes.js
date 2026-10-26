import { $app, openModal, onTap } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, since, initialsOf } from '../../core/format.js';
import { url } from '../../core/router.js';
import { tabbar } from '../tabbar.js';

const STATUS = {
  free: { cls: 'st-free', label: 'Свободен', svg: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>' },
  busy: { cls: 'st-busy', label: 'Занят', svg: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>' },
  off: { cls: 'st-off', label: 'Недоступен', svg: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>' },
  fix: { cls: 'st-fix', label: 'Обслуживание', svg: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
};

const glyph = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${STATUS[key].svg}</svg>`;

const statusIcon = key => {
  const st = STATUS[key];
  return `<span class="st ${st.cls}" role="img" aria-label="${st.label}" title="${st.label}">${glyph(key)}</span>`;
};

const bikeCard = (b, activeRental) => {
  const unavailable = b.availability !== 'available' && !b.mine;
  const locked = unavailable || (b.busy && !b.mine) || (activeRental && !b.mine);
  const status = b.mine || b.busy ? 'busy' : unavailable ? 'off' : 'free';
  const inner = `
    <div>
      <div class="name">${esc(b.name)}</div>
      ${b.mine
        ? `<div class="rent-timer" data-since="${b.rental.startedAt}" aria-label="Время аренды">${since(b.rental.startedAt)}</div>`
        : `<div class="spec">Скорость до ${b.speed} km/h</div>
      <div class="spec-2">Батарея ${esc(b.battery)}</div>`}
    </div>
    <div class="side">
      <div class="status">${b.repairs.length ? statusIcon('fix') : ''}${statusIcon(status)}</div>
      <div class="rate">Flex ${b.rate} ₽</div>
    </div>`;
  if (b.busy && !b.mine) return `<button class="bike-card busy-other" data-busy="${b.id}">${inner}</button>`;
  return locked
    ? `<button class="bike-card" disabled>${inner}</button>`
    : `<a class="bike-card" href="${url(`/bike/${b.id}`)}">${inner}</a>`;
};

export async function screenBikes() {
  const { bikes, activeRental } = await api('GET', '/api/bikes');
  state.activeRental = activeRental;
  $app.innerHTML = `
    <section class="screen yellow-top with-tabs">
      <div class="top"><h1>Байки</h1></div>
      <div class="sheet">
        <div class="bike-list">${bikes.map(b => bikeCard(b, activeRental)).join('')}</div>
      </div>
      ${tabbar('/bikes')}
    </section>`;

  $app.querySelectorAll('[data-busy]').forEach(el => {
    onTap(el, () => showBusy(bikes.find(b => b.id === Number(el.dataset.busy))));
  });
}

const shortName = name => name.trim().split(/\s+/).slice(0, 2).join(' ');

function showBusy(bike) {
  const { userName, userPhoto } = bike.rental;
  const { card, close } = openModal(`
    <div class="modal-card confirm-card busy-card" role="alertdialog" aria-modal="true">
      <span class="avatar busy-ava" style="${userPhoto ? `background-image:url('${userPhoto}')` : ''}">${userPhoto ? '' : esc(initialsOf(userName))}</span>
      <h2>${esc(bike.name)} используется</h2>
      <p class="modal-lead">Байк сейчас у курьера ${esc(shortName(userName))}</p>
      <div class="modal-actions"><button class="btn btn-primary" type="button" data-ok>ОК</button></div>
    </div>`);
  onTap(card.querySelector('[data-ok]'), close);
}

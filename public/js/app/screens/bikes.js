import { $app, openModal, onTap } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, since, initialsOf, shortName } from '../../core/format.js';
import { url } from '../../core/router.js';
import { tabbar } from '../tabbar.js';
import { statusIcon } from '../../core/status.js';

const bikeCard = (b, activeRental) => {
  const unavailable = b.availability !== 'available' && !b.mine;
  const locked = unavailable || (b.busy && !b.mine) || (activeRental && !b.mine);
  const status = b.mine || b.busy ? 'busy' : unavailable ? 'off' : 'free';
  const inner = `
    <div>
      <div class="name">${esc(b.name)}</div>
      ${b.mine
        ? `<div class="rent-timer" data-since="${b.rental.startedAt}" aria-label="Время аренды">${since(b.rental.startedAt)}</div>`
        : `<div class="spec">${b.speed ? `Скорость до ${b.speed} km/h` : '&nbsp;'}</div>
      <div class="spec-2">${b.battery ? `Батарея ${esc(b.battery)}` : '&nbsp;'}</div>`}
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

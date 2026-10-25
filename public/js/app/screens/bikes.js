import { $app } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, since } from '../../core/format.js';
import { url } from '../../core/router.js';
import { tabbar } from '../tabbar.js';

const bikeCard = (b, activeRental) => {
  const locked = (b.busy && !b.mine) || (activeRental && !b.mine);
  const tag = b.mine
    ? `<span class="tag tag-mine" data-since="${b.rental.startedAt}" aria-label="Ваша аренда">${since(b.rental.startedAt)}</span>`
    : b.busy ? '<span class="tag tag-busy">Занят</span>' : '';
  const inner = `
    <div>
      <div class="name">${esc(b.name)}</div>
      <div class="spec">Скорость до ${b.speed} km/h</div>
      <div class="spec-2">Батарея ${esc(b.battery)}</div>
    </div>
    <div class="side">
      <div class="rate">Flex ${b.rate} ₽</div>
      ${tag}
    </div>`;
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
}

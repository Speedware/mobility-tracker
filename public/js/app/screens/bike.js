import { $app, toast } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, since } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { go, url, render } from '../../core/router.js';
import { SUPPORT_TEL } from '../config.js';
import { tabbar } from '../tabbar.js';
import { setupSwipe } from '../swipe.js';

export async function screenBike(id) {
  const { bikes, activeRental } = await api('GET', '/api/bikes');
  state.activeRental = activeRental;
  if (activeRental && activeRental.bikeId !== Number(id)) return go(`/bike/${activeRental.bikeId}`, { replace: true });
  const bike = bikes.find(b => b.id === Number(id));
  if (!bike) return go('/bikes', { replace: true });
  if (bike.availability !== 'available' && !bike.mine) {
    toast('Этот байк сейчас недоступен', true);
    return go('/bikes', { replace: true });
  }
  if (bike.busy && !bike.mine) {
    toast('Этот байк сейчас работает у другого курьера', true);
    return go('/bikes', { replace: true });
  }

  const renting = !!activeRental;
  const action = renting ? 'Завершить аренду' : 'Начать аренду';
  const repairPath = bike.repairs.length ? `/requests/${bike.id}` : `/repair/${bike.id}`;

  $app.innerHTML = `
    <section class="screen bike-screen with-tabs">
      <div class="top"><h1>Мой байк</h1>${renting ? '' : `<a class="btn-pill" href="${url('/bikes')}">Назад</a>`}</div>
      <div class="bike-hero">
        <div class="model">${esc(bike.name)}</div>
        <img src="${bike.image}" alt="${esc(bike.name)}">
      </div>
      <div class="bike-sheet">
        <div class="swipe" id="swipe">
          <div class="swipe-label">${action}</div>
          <button class="knob" aria-label="${action}">${icons.arrow}</button>
        </div>
        <div class="timer" ${renting ? `data-since="${activeRental.startedAt}"` : ''}>${renting ? since(activeRental.startedAt) : '00:00:00'}</div>
        <a class="btn btn-outline" href="${SUPPORT_TEL}">Позвонить в поддержку</a>
        <a class="btn btn-outline" href="${url(repairPath)}">Запросить обслуживание</a>
      </div>
      ${tabbar('/bikes')}
    </section>`;

  setupSwipe(document.getElementById('swipe'), async () => {
    if (renting) return go('/finish');
    state.activeRental = (await api('POST', '/api/rentals', { bikeId: bike.id })).activeRental;
    toast('Аренда началась. Хорошей дороги!');
    render();
  });
}

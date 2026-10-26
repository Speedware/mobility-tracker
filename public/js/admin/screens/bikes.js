import { $app, toast, openModal, onSubmit, fitImage } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, since, shortName } from '../../core/format.js';
import { BIKE_AVAILABILITY, bikeState, STATE_LABEL } from '../../core/domain.js';
import { icons } from '../../core/icons.js';
import { render } from '../../core/router.js';
import { deskShell } from '../shell.js';

const stateCell = b => {
  const st = bikeState(b);
  return `<div class="state-text">
      <span class="st-${st}">${STATE_LABEL[st]}</span>${b.repairs.length ? ' <span class="st-fix">+ Обслуживание</span>' : ''}
    </div>${b.rental
    ? `<small>${esc(shortName(b.rental.userName))} · <span data-since="${b.rental.startedAt}">${since(b.rental.startedAt)}</span></small>` : ''}`;
};

const row = b => `<tr class="${b.availability === 'hidden' ? 'blocked' : ''}" data-bike="${b.id}">
  <td><div class="d-person"><img class="d-thumb" src="${b.image}" alt=""><b class="y">${esc(b.name)}</b></div></td>
  <td>${stateCell(b)}</td>
  <td class="num nowrap">
    <label class="rate-field custom">
      <input class="field" type="number" inputmode="numeric" min="1" max="10000" data-rate value="${b.rate}" aria-label="Базовый тариф ${esc(b.name)}">
      <span>₽</span>
    </label>
  </td>
  <td class="nowrap">
    <select class="pay-select" data-avail data-status="${b.availability}" aria-label="Доступность ${esc(b.name)}">
      ${Object.entries(BIKE_AVAILABILITY).map(([k, v]) => `<option value="${k}" ${k === b.availability ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
  </td>
</tr>`;

export async function deskBikes() {
  const { bikes } = await api('GET', '/api/admin/bikes');

  deskShell('/bikes', 'Байки', `
    <div class="d-card">
      <table class="d-table">
        <thead><tr><th>Байк</th><th>Статус</th><th class="num">Базовый тариф Flex</th><th>Доступность</th></tr></thead>
        <tbody>${bikes.map(row).join('')}</tbody>
      </table>
    </div>`,
    `<button class="btn btn-primary d-add" id="add-bike">${icons.plus}Добавить байк</button>`);

  document.getElementById('add-bike').onclick = createBike;

  $app.querySelectorAll('tr[data-bike]').forEach(tr => {
    const bike = bikes.find(b => b.id === Number(tr.dataset.bike));
    const select = tr.querySelector('[data-avail]');
    const input = tr.querySelector('[data-rate]');

    select.onchange = async () => {
      select.disabled = true;
      try {
        await api('PATCH', `/api/admin/bikes/${bike.id}`, { availability: select.value });
        toast(`${bike.name}: ${BIKE_AVAILABILITY[select.value].toLowerCase()}`);
        render();
      } catch (e) { toast(e.message, true); select.disabled = false; select.value = select.dataset.status; }
    };

    input.addEventListener('change', async () => {
      const value = input.value.trim();
      if (value === String(bike.rate)) return;
      try {
        await api('PATCH', `/api/admin/bikes/${bike.id}`, { rate: value });
        bike.rate = Number(value);
        toast(`${bike.name}: базовый тариф ${value} ₽`);
      } catch (e) { toast(e.message, true); input.value = bike.rate; }
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  });
}

function createBike() {
  let photo = null;
  const { card, close } = openModal(`
    <form class="modal-card">
      <h2>Новый байк</h2>
      <button class="bike-photo" type="button" data-photo aria-label="Добавить фото">
        <span data-placeholder>${icons.camera}<small>Фото байка</small></span>
      </button>
      <input type="file" data-photo-input accept="image/*" hidden>
      <div class="form">
        <input class="field" name="name" placeholder="Название" maxlength="40" autocomplete="off">
        <input class="field" name="rate" type="number" inputmode="numeric" min="1" max="10000" placeholder="Базовый тариф Flex, ₽">
        <div class="form-row">
          <input class="field" name="speed" type="number" inputmode="numeric" min="0" max="200" placeholder="Скорость, km/h">
          <input class="field" name="battery" placeholder="Батарея, например 30ah" maxlength="20">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-close>Отмена</button>
        <button class="btn btn-primary" type="submit">Добавить</button>
      </div>
    </form>`);

  const input = card.querySelector('[data-photo-input]');
  const box = card.querySelector('[data-photo]');
  box.onclick = () => input.click();
  input.onchange = async () => {
    if (!input.files[0]) return;
    try {
      photo = await fitImage(input.files[0]);
      box.style.backgroundImage = `url('${photo}')`;
      box.classList.add('has-photo');
    } catch (e) { toast(e.message, true); }
  };
  card.querySelector('[name=name]').focus();

  onSubmit(card, async data => {
    if (!photo) throw new Error('Добавьте фото байка');
    await api('POST', '/api/admin/bikes', { ...data, photo });
    close();
    toast(`Байк ${data.name.trim()} добавлен`);
    render();
  });
}

import { $app, toast } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, since } from '../../core/format.js';
import { BIKE_AVAILABILITY } from '../../core/domain.js';
import { render } from '../../core/router.js';
import { deskShell } from '../shell.js';

const HINTS = {
  available: 'Курьеры видят и могут арендовать',
  unavailable: 'Виден курьерам, но арендовать нельзя',
  hidden: 'Курьеры не видят',
};

const stateCell = b => {
  const tags = [b.busy ? '<span class="tag tag-busy">В аренде</span>' : '<span class="tag tag-free">Свободен</span>'];
  if (b.repairs.length) tags.push('<span class="tag tag-repair">Ремонт</span>');
  return `<div class="parts">${tags.join('')}</div>${b.rental
    ? `<small>${esc(b.rental.userName)} · <span data-since="${b.rental.startedAt}">${since(b.rental.startedAt)}</span></small>` : ''}`;
};

const row = b => `<tr class="${b.availability === 'hidden' ? 'blocked' : ''}">
  <td><div class="d-person"><img class="d-thumb" src="${b.image}" alt=""><b class="y">${esc(b.name)}</b></div></td>
  <td class="num">Flex ${b.rate} ₽</td>
  <td>${stateCell(b)}</td>
  <td class="nowrap">
    <select class="pay-select" data-avail="${b.id}" data-status="${b.availability}" aria-label="Доступность ${esc(b.name)}">
      ${Object.entries(BIKE_AVAILABILITY).map(([k, v]) => `<option value="${k}" ${k === b.availability ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
    <small>${HINTS[b.availability]}</small>
  </td>
</tr>`;

export async function deskBikes() {
  const { bikes } = await api('GET', '/api/admin/bikes');

  deskShell('/bikes', 'Байки', `
    <div class="d-card">
      <table class="d-table">
        <thead><tr><th>Байк</th><th class="num">Тариф</th><th>Сейчас</th><th>Доступность</th></tr></thead>
        <tbody>${bikes.map(row).join('')}</tbody>
      </table>
    </div>`);

  $app.querySelectorAll('[data-avail]').forEach(el => {
    el.onchange = async () => {
      const bike = bikes.find(b => b.id === Number(el.dataset.avail));
      el.disabled = true;
      try {
        await api('PATCH', `/api/admin/bikes/${bike.id}`, { availability: el.value });
        toast(`${bike.name}: ${BIKE_AVAILABILITY[el.value].toLowerCase()}`);
        render();
      } catch (e) { toast(e.message, true); el.disabled = false; el.value = el.dataset.status; }
    };
  });
}

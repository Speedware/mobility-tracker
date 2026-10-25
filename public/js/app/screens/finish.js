import { $app, toast, confirmDialog, onTap } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { esc, rub, since, between } from '../../core/format.js';
import { go, onLeave, leaveScreen } from '../../core/router.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
const KEY_LABELS = { 'C': 'Очистить', '⌫': 'Стереть' };

export async function screenFinish() {
  const [{ activeRental }, { bikes }] = await Promise.all([api('GET', '/api/me'), api('GET', '/api/bikes')]);
  state.activeRental = activeRental;
  if (!activeRental) return go('/bikes', { replace: true });
  const bike = bikes.find(b => b.id === activeRental.bikeId);
  const rate = activeRental.rate;
  let value = '';

  $app.innerHTML = `
    <section class="screen">
      <div class="top"><h1>Сколько заказов?</h1></div>
      <div class="calc-meta">
        <span>${esc(bike.name)} · Flex ${rate} ₽</span>
        <span data-since="${activeRental.startedAt}">${since(activeRental.startedAt)}</span>
      </div>
      <div class="calc-display">
        <div class="num" id="num">0</div>
        <div class="formula" id="formula"></div>
      </div>
      <div class="keypad">
        ${KEYS.map(k => `<button class="key ${/\d/.test(k) ? '' : 'fn'}" data-key="${k}" aria-label="${KEY_LABELS[k] || k}">${k}</button>`).join('')}
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="confirm">Завершить аренду</button>
        <button class="btn btn-outline" id="back">Назад</button>
      </div>
    </section>`;

  const num = document.getElementById('num');
  const formula = document.getElementById('formula');
  const update = () => {
    const n = Number(value || 0);
    num.textContent = n.toLocaleString('ru-RU');
    formula.innerHTML = `${rate} ₽ × ${n} = <b>${rub(rate * n)}</b>`;
  };
  const press = k => {
    if (k === 'C') value = '';
    else if (k === '⌫') value = value.slice(0, -1);
    else if (value.length < 4) value = (value + k).replace(/^0+(?=\d)/, '');
    update();
  };
  $app.querySelectorAll('.key').forEach(el => onTap(el, () => press(el.dataset.key)));
  onTap(document.getElementById('back'), () => go(`/bike/${bike.id}`));

  const onKey = e => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('⌫');
    else if (e.key === 'Escape') press('C');
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));
  update();

  const confirmBtn = document.getElementById('confirm');
  onTap(confirmBtn, async () => {
    const orders = Number(value || 0);
    if (orders === 0 && !await confirmDialog({
      title: 'Завершить без заказов?', text: 'Сумма аренды будет 0 ₽.', ok: 'Завершить',
    })) return;
    confirmBtn.disabled = true;
    try {
      const { rental } = await api('POST', `/api/rentals/${activeRental.id}/finish`, { orders });
      state.activeRental = null;
      leaveScreen();
      showReport(bike, rental);
    } catch (e) {
      toast(e.message, true);
      confirmBtn.disabled = false;
    }
  });
}

function showReport(bike, r) {
  $app.innerHTML = `
    <section class="screen page-enter">
      <div class="top"><h1>Отчёт</h1></div>
      <div class="summary">
        <div class="row"><span>Байк</span><span>${esc(bike.name)}</span></div>
        <div class="row"><span>Время</span><span>${between(r.started_at, r.ended_at)}</span></div>
        <div class="row"><span>Заказов</span><span>${r.orders}</span></div>
        <div class="row"><span>Тариф</span><span>Flex ${r.rate} ₽ × ${r.orders}</span></div>
        <div class="row total"><span>Итого</span><span>${rub(r.total)}</span></div>
      </div>
      <div class="actions"><button class="btn btn-primary" id="done">Готово</button></div>
    </section>`;
  onTap(document.getElementById('done'), () => go('/bikes'));
}

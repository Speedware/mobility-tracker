import { toast } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { deskShell } from '../shell.js';

export async function deskSettings() {
  const { registrationOpen, planTarget } = await api('GET', '/api/admin/settings');
  deskShell('/settings', 'Настройки', `
    <div class="d-card d-pad">
      <div class="switch-row">
        <span><b>Регистрация курьеров</b></span>
        <label class="switch-hit"><input type="checkbox" class="switch" id="reg" aria-label="Регистрация курьеров" ${registrationOpen ? 'checked' : ''}></label>
      </div>
      <div class="switch-row">
        <span><b>Цель по плану на неделю</b></span>
        <label class="rate-field custom">
          <input class="field" id="plan-target" type="number" inputmode="numeric" min="1" max="1000000" value="${planTarget}" aria-label="Цель по плану на неделю">
          <span>₽</span>
        </label>
      </div>
    </div>`);

  const sw = document.getElementById('reg');
  sw.onchange = async () => {
    sw.disabled = true;
    try {
      const r = await api('PATCH', '/api/admin/settings', { registrationOpen: sw.checked });
      toast(r.registrationOpen ? 'Регистрация открыта' : 'Регистрация закрыта');
    } catch (e) { sw.checked = !sw.checked; toast(e.message, true); }
    sw.disabled = false;
  };

  const planInput = document.getElementById('plan-target');
  planInput.addEventListener('change', async () => {
    const value = planInput.value.trim();
    if (value === String(planTarget)) return;
    try {
      await api('PATCH', '/api/admin/settings', { planTarget: value });
      toast(`Цель по плану: ${value} ₽`);
    } catch (e) { toast(e.message, true); planInput.value = planTarget; }
  });
  planInput.addEventListener('keydown', e => { if (e.key === 'Enter') planInput.blur(); });
}

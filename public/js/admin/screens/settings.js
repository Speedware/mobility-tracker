import { toast } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { deskShell } from '../shell.js';

export async function deskSettings() {
  const { registrationOpen } = await api('GET', '/api/admin/settings');
  deskShell('/settings', 'Настройки', `
    <div class="d-card d-pad">
      <div class="switch-row">
        <span><b>Регистрация курьеров</b></span>
        <label class="switch-hit"><input type="checkbox" class="switch" id="reg" aria-label="Регистрация курьеров" ${registrationOpen ? 'checked' : ''}></label>
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
}

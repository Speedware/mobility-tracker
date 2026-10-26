import { $app, toast, onSubmit } from '../../core/ui.js';
import { api } from '../../core/api.js';
import { esc, fmtDate } from '../../core/format.js';
import { icons } from '../../core/icons.js';
import { REPAIR_PARTS, COMMENT_MAX, partTags } from '../../core/domain.js';
import { go, url } from '../../core/router.js';

const findBike = async id => (await api('GET', '/api/bikes')).bikes.find(b => b.id === Number(id));

export async function screenRequests(id) {
  const bike = await findBike(id);
  if (!bike) return go('/bikes', { replace: true });
  if (!bike.repairs.length) return go(`/repair/${bike.id}`, { replace: true });
  $app.innerHTML = `
    <section class="screen requests">
      <div class="top"><h1>Заявки</h1></div>
      <p class="requests-lead">${esc(bike.name)} уже ждёт обслуживания. Если поломка та же — новую заявку создавать не нужно.</p>
      <div class="requests-list">
        ${bike.repairs.map(r => `
          <div class="request">
            <div class="parts">${partTags(r.parts)}</div>
            ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
            <div class="meta">${esc(r.userName)} · ${fmtDate(r.createdAt)}</div>
          </div>`).join('')}
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="${url(`/repair/${bike.id}`)}">Новая заявка</a>
        <a class="btn btn-outline" href="${url(`/bike/${bike.id}`)}">Назад</a>
      </div>
    </section>`;
}

export async function screenRepair(id) {
  const bike = await findBike(id);
  if (!bike) return go('/bikes', { replace: true });
  const selected = new Set();
  const back = bike.repairs.length ? `/requests/${bike.id}` : `/bike/${bike.id}`;

  $app.innerHTML = `
    <section class="screen">
      <div class="top"><h1>Что сломалось?</h1></div>
      <div class="part-grid">
        ${REPAIR_PARTS.map(p => `
          <button class="part" type="button" data-part="${p.id}" aria-pressed="false">${icons[p.id]}<span>${p.label}</span></button>`).join('')}
      </div>
      <form class="form repair-form" id="repair">
        <textarea class="field" name="comment" placeholder="Комментарий" maxlength="${COMMENT_MAX}"></textarea>
        <div class="counter"><span id="cnt">0</span> / ${COMMENT_MAX}</div>
      </form>
      <div class="actions">
        <button class="btn btn-primary" type="submit" form="repair">Отправить заявку</button>
        <a class="btn btn-outline" href="${url(back)}">Назад</a>
      </div>
    </section>`;

  $app.querySelectorAll('.part').forEach(el => {
    el.onclick = () => {
      const p = el.dataset.part;
      selected.has(p) ? selected.delete(p) : selected.add(p);
      el.setAttribute('aria-pressed', String(selected.has(p)));
    };
  });
  const comment = $app.querySelector('[name=comment]');
  comment.oninput = () => { document.getElementById('cnt').textContent = comment.value.length; };

  onSubmit(document.getElementById('repair'), async data => {
    if (!selected.size) throw new Error('Выберите, что сломалось');
    if (!data.comment.trim()) throw new Error('Опишите поломку в комментарии');
    await api('POST', '/api/repairs', { bikeId: bike.id, parts: [...selected], comment: data.comment });
    toast('Заявка на обслуживание отправлена');
    go(`/bike/${bike.id}`, { replace: true });
  });
}

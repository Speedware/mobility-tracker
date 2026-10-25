import { toast } from '../core/ui.js';

export function setupSwipe(track, onDone) {
  const knob = track.querySelector('.knob');
  const label = track.querySelector('.swipe-label');
  let startX = 0, x = 0, dragging = false;
  const max = () => track.clientWidth - knob.offsetWidth - 14;

  const set = (v, animate) => {
    x = Math.max(0, Math.min(max(), v));
    knob.style.transition = animate ? 'transform .25s ease' : 'none';
    knob.style.transform = `translateX(${x}px)`;
    label.style.opacity = String(1 - x / max());
  };

  const finish = async () => {
    track.classList.add('busy');
    try { await onDone(); }
    catch (e) { toast(e.message, true); track.classList.remove('busy'); set(0, true); }
  };

  knob.addEventListener('pointerdown', e => {
    dragging = true;
    startX = e.clientX - x;
    knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener('pointermove', e => { if (dragging) set(e.clientX - startX, false); });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (x >= max() * 0.85) { set(max(), true); finish(); } else set(0, true);
  };
  knob.addEventListener('pointerup', end);
  knob.addEventListener('pointercancel', end);
  knob.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(max(), true); finish(); }
  });
}

export function showSplash() {
  try {
    if (sessionStorage.getItem('splashSeen')) return;
    sessionStorage.setItem('splashSeen', '1');
  } catch {}
  const el = document.createElement('div');
  el.className = 'splash';
  el.innerHTML = '<iframe src="/splash.html" title="" aria-hidden="true"></iframe>';
  document.body.appendChild(el);
  const hide = () => { el.classList.add('hide'); setTimeout(() => el.remove(), 450); };
  const frame = el.querySelector('iframe');
  frame.addEventListener('load', () => {
    frame.contentWindow.addEventListener('splashend', () => setTimeout(hide, 350));
    frame.contentDocument.addEventListener('click', hide);
  });
  el.addEventListener('click', hide);
  setTimeout(hide, 6500);
}

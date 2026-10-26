export const STATUS = {
  free: { cls: 'st-free', label: 'Свободен', svg: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>' },
  busy: { cls: 'st-busy', label: 'Занят', svg: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>' },
  off: { cls: 'st-off', label: 'Недоступен', svg: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>' },
  fix: { cls: 'st-fix', label: 'Обслуживание', svg: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
};

const glyph = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${STATUS[key].svg}</svg>`;

export const statusIcon = key => {
  const st = STATUS[key];
  return `<span class="st ${st.cls}" role="img" aria-label="${st.label}" title="${st.label}">${glyph(key)}</span>`;
};

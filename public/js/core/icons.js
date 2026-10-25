const svg = (body, attrs = 'viewBox="0 0 24 24" stroke-width="1.8"') =>
  `<svg ${attrs} fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const part = body => svg(body, 'viewBox="0 0 32 32" stroke-width="2.2"');

export const icons = {
  bike: svg('<circle cx="18" cy="17" r="2"/><path d="M5 16v1a2 2 0 0 0 4 0v-5H6a3 3 0 0 0-3 3v1h10a6 6 0 0 1 5-4V7a2 2 0 0 0-2-2h-1"/><path d="M6 9h3"/>'),
  history: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 4v4.5H8M12 7.5V12l3 2"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  panel: svg('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>'),
  wrench: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>'),
  burger: svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 'viewBox="0 0 24 24" stroke-width="2"'),

  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'viewBox="0 0 24 24" stroke-width="2.4"'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  logout: svg('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 'width="16" height="16" viewBox="0 0 24 24" stroke-width="2.2"'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'viewBox="0 0 24 24" stroke-width="3"'),
  alert: svg('<path d="M12 6.5v7M12 17.5v.01"/>', 'viewBox="0 0 24 24" stroke-width="3"'),
  arrow: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F7D049" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',

  brakes: part('<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="3.5"/><path d="M16 5v4M16 23v4M5 16h4M23 16h4"/><path d="M24 7.5a12 12 0 0 1 3 5" stroke-width="4"/>'),
  lights: part('<path d="M12 7a9 9 0 0 0 0 18h3V7z"/><path d="M20 10h7M20 16h8M20 22h7"/>'),
  battery: part('<rect x="4" y="9" width="21" height="14" rx="3"/><path d="M28 13.5v5"/><path d="M15 12l-3 4.5h4L13 21"/>'),
  throttle: part('<path d="M3 16h7"/><rect x="10" y="11.5" width="17" height="9" rx="4.5"/><path d="M15 11.5v9M19 11.5v9M23 11.5v9"/>'),
  mirrors: part('<ellipse cx="20" cy="10" rx="8" ry="5" transform="rotate(-15 20 10)"/><path d="M15 14 7 27"/>'),
  other: part('<circle cx="16" cy="16" r="12"/><circle cx="10.5" cy="16" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><circle cx="21.5" cy="16" r="1.4" fill="currentColor"/>'),
};

export const BOLT_SVG = '<svg class="bolt" viewBox="150 100 230 300" aria-hidden="true"><g transform="matrix(3 0 -1.5 3 229 121)"><rect class="bp" width="27" height="54"/><rect class="bp bp2" x="36" y="36" width="27" height="54"/></g></svg>';

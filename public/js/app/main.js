import { state } from '../core/state.js';
import { loadSession, fontsReady } from '../core/api.js';
import { startRouter, render, currentPath, url } from '../core/router.js';
import { showSplash } from './splash.js';
import { slideTabIndicator } from './tabbar.js';
import { screenWelcome, screenLogin, screenRegister } from './screens/auth.js';
import { screenBikes } from './screens/bikes.js';
import { screenBike } from './screens/bike.js';
import { screenRequests, screenRepair } from './screens/repair.js';
import { screenFinish } from './screens/finish.js';
import { screenHistory } from './screens/history.js';
import { screenSettings } from './screens/settings.js';

const routes = [
  [/^\/welcome$/, screenWelcome, { guest: true }],
  [/^\/login$/, screenLogin, { guest: true }],
  [/^\/register$/, screenRegister, { guest: true }],
  [/^\/bikes$/, screenBikes],
  [/^\/bike\/(\d+)$/, screenBike],
  [/^\/requests\/(\d+)$/, screenRequests],
  [/^\/repair\/(\d+)$/, screenRepair],
  [/^\/finish$/, screenFinish],
  [/^\/history$/, screenHistory],
  [/^\/settings$/, screenSettings],
];

startRouter({
  base: '/app',
  home: '/bikes',
  login: '/welcome',
  routes,
  authorized: () => !!state.me,
  afterRender: slideTabIndicator,
});

showSplash();
await Promise.all([loadSession(), fontsReady()]);
if (state.activeRental && ['/', '/bikes'].includes(currentPath())) {
  history.replaceState(null, '', url(`/bike/${state.activeRental.bikeId}`));
}
render();

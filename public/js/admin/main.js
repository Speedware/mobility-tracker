import { state } from '../core/state.js';
import { loadSession, fontsReady } from '../core/api.js';
import { startRouter, render } from '../core/router.js';
import { deskLogin } from './screens/login.js';
import { deskOverview } from './screens/overview.js';
import { deskBikes } from './screens/bikes.js';
import { deskRepairs } from './screens/repairs.js';
import { deskRentals } from './screens/rentals.js';
import { deskCouriers } from './screens/couriers.js';
import { deskCourier } from './screens/courier.js';
import { deskSettings } from './screens/settings.js';

const routes = [
  [/^\/login$/, deskLogin, { guest: true }],
  [/^\/$/, deskOverview],
  [/^\/bikes$/, deskBikes],
  [/^\/repairs$/, deskRepairs],
  [/^\/rentals$/, deskRentals],
  [/^\/couriers$/, deskCouriers],
  [/^\/couriers\/(\d+)$/, deskCourier],
  [/^\/settings$/, deskSettings],
];

startRouter({
  base: '/admin',
  home: '/',
  login: '/login',
  routes,
  authorized: () => !!state.me?.isAdmin,
});

await Promise.all([loadSession(), fontsReady()]);
render();

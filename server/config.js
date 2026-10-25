const path = require('node:path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DATA_DIR: path.join(ROOT, 'data'),

  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'antonraseperin@gmail.com').toLowerCase(),

  SESSION_DAYS: 30,
  HISTORY_DAYS: 30,
  REPAIR_PARTS: ['brakes', 'lights', 'battery', 'throttle', 'mirrors', 'other'],
  COMMENT_MAX: 300,
  PAY_STATUSES: ['pending', 'paid', 'rejected'],
  PHOTO_MAX: 2 * 1024 * 1024,
  BODY_MAX: 3 * 1024 * 1024,
};

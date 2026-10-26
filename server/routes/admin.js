const { db, now, registrationOpen, setRegistrationOpen } = require('../db');
const { ADMIN_EMAIL, PAY_STATUSES, BIKE_AVAILABILITY } = require('../config');
const { HttpError, send, readJson, str, isEmail, parsePhoto } = require('../lib/http');
const { hashPassword, isAdmin, dropSessions } = require('../lib/auth');
const { bikeList, personalTerms, RENTAL_FIELDS, rentalRow } = require('../services/fleet');

const ADMIN = { admin: true };

module.exports = route => {
  route('GET', '/api/admin/overview', (req, res, user) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const statsSince = d => db.prepare(`
      SELECT COUNT(*) AS rentals, COALESCE(SUM(orders), 0) AS orders, COALESCE(SUM(total), 0) AS revenue
      FROM rentals WHERE ended_at IS NOT NULL AND pay_status <> 'rejected' AND ended_at >= ?`).get(d.toISOString());
    const recent = db.prepare(`
      SELECT ${RENTAL_FIELDS}, u.name AS userName
      FROM rentals r JOIN bikes b ON b.id = r.bike_id JOIN users u ON u.id = r.user_id
      ORDER BY r.started_at DESC LIMIT 5`).all().map(rentalRow);
    send(res, 200, { bikes: bikeList(user.id, { includeHidden: true, personal: false }), today: statsSince(today), month: statsSince(month), recent });
  }, ADMIN);

  route('GET', '/api/admin/bikes', (req, res, user) => {
    send(res, 200, { bikes: bikeList(user.id, { includeHidden: true, personal: false }) });
  }, ADMIN);

  route('PATCH', /^\/api\/admin\/bikes\/(\d+)$/, async (req, res, user, [id]) => {
    const b = await readJson(req);
    if (!BIKE_AVAILABILITY.includes(b.availability)) throw new HttpError(400, 'Некорректный статус байка');
    const r = db.prepare('UPDATE bikes SET availability = ? WHERE id = ?').run(b.availability, Number(id));
    if (!r.changes) throw new HttpError(404, 'Байк не найден');
    send(res, 200, { ok: true });
  }, ADMIN);

  route('GET', '/api/admin/repairs', (req, res) => {
    const rows = db.prepare(`
      SELECT r.id, b.name AS bike, u.name AS userName, r.parts, r.comment, r.created_at AS createdAt, r.resolved_at AS resolvedAt
      FROM repairs r JOIN bikes b ON b.id = r.bike_id JOIN users u ON u.id = r.user_id
      ORDER BY r.resolved_at IS NOT NULL, r.created_at DESC LIMIT 500`).all();
    send(res, 200, { repairs: rows.map(r => ({ ...r, parts: JSON.parse(r.parts) })) });
  }, ADMIN);

  route('POST', /^\/api\/admin\/repairs\/(\d+)\/resolve$/, (req, res, user, [id]) => {
    const r = db.prepare('UPDATE repairs SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL').run(now(), Number(id));
    if (!r.changes) throw new HttpError(404, 'Заявка не найдена');
    send(res, 200, { ok: true });
  }, ADMIN);

  route('DELETE', /^\/api\/admin\/repairs\/(\d+)$/, (req, res, user, [id]) => {
    const r = db.prepare('DELETE FROM repairs WHERE id = ?').run(Number(id));
    if (!r.changes) throw new HttpError(404, 'Заявка не найдена');
    send(res, 200, { ok: true });
  }, ADMIN);

  route('GET', '/api/admin/rentals', (req, res) => {
    const rows = db.prepare(`
      SELECT ${RENTAL_FIELDS}, u.name AS userName
      FROM rentals r JOIN bikes b ON b.id = r.bike_id JOIN users u ON u.id = r.user_id
      ORDER BY r.ended_at IS NOT NULL, r.started_at DESC`).all();
    send(res, 200, { rentals: rows.map(rentalRow) });
  }, ADMIN);

  route('PATCH', /^\/api\/admin\/rentals\/(\d+)$/, async (req, res, user, [id]) => {
    const b = await readJson(req);
    const r = db.prepare('SELECT * FROM rentals WHERE id = ?').get(Number(id));
    if (!r) throw new HttpError(404, 'Аренда не найдена');
    if (!r.ended_at) throw new HttpError(409, 'Аренда ещё не завершена');
    let orders = r.orders;
    if ('orders' in b) {
      orders = Number(b.orders);
      if (!Number.isInteger(orders) || orders < 0 || orders > 9999) throw new HttpError(400, 'Некорректное количество заказов');
    }
    const status = 'payStatus' in b ? b.payStatus : r.pay_status;
    if (!PAY_STATUSES.includes(status)) throw new HttpError(400, 'Некорректный статус оплаты');
    db.prepare('UPDATE rentals SET orders = ?, total = ?, pay_status = ? WHERE id = ?').run(orders, r.rate * orders, status, r.id);
    send(res, 200, { ok: true });
  }, ADMIN);

  route('DELETE', /^\/api\/admin\/rentals\/(\d+)$/, (req, res, user, [id]) => {
    const r = db.prepare('DELETE FROM rentals WHERE id = ?').run(Number(id));
    if (!r.changes) throw new HttpError(404, 'Аренда не найдена');
    send(res, 200, { ok: true });
  }, ADMIN);

  route('GET', '/api/admin/couriers', (req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.photo, u.blocked, u.rating, u.created_at AS createdAt,
        COUNT(CASE WHEN r.ended_at IS NOT NULL AND r.pay_status <> 'rejected' THEN 1 END) AS rentals,
        COALESCE(SUM(CASE WHEN r.pay_status <> 'rejected' THEN r.orders END), 0) AS orders,
        COALESCE(SUM(CASE WHEN r.pay_status <> 'rejected' THEN r.total END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN r.ended_at IS NOT NULL AND r.pay_status = 'pending' THEN r.total END), 0) AS unpaid,
        MAX(r.started_at) AS lastRentalAt,
        (SELECT b.name FROM rentals a JOIN bikes b ON b.id = a.bike_id WHERE a.user_id = u.id AND a.ended_at IS NULL) AS activeBike
      FROM users u LEFT JOIN rentals r ON r.user_id = u.id
      WHERE lower(u.email) <> ?
      GROUP BY u.id ORDER BY u.name`).all(ADMIN_EMAIL);
    send(res, 200, { couriers: rows.map(c => ({ ...c, blocked: !!c.blocked })) });
  }, ADMIN);

  route('GET', /^\/api\/admin\/couriers\/(\d+)$/, (req, res, user, [id]) => {
    const c = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    if (!c || isAdmin(c)) throw new HttpError(404, 'Курьер не найден');
    const terms = personalTerms(c.id);
    const bikes = db.prepare('SELECT * FROM bikes ORDER BY sort, id').all().map(b => ({
      id: b.id, name: b.name, image: `/assets/bikes/${b.image}`, availability: b.availability,
      baseRate: b.rate, rate: terms.get(b.id)?.rate ?? null, hidden: !!terms.get(b.id)?.hidden,
    }));
    const stats = db.prepare(`
      SELECT COUNT(CASE WHEN ended_at IS NOT NULL AND pay_status <> 'rejected' THEN 1 END) AS rentals,
        COALESCE(SUM(CASE WHEN pay_status <> 'rejected' THEN orders END), 0) AS orders,
        COALESCE(SUM(CASE WHEN pay_status <> 'rejected' THEN total END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN ended_at IS NOT NULL AND pay_status = 'pending' THEN total END), 0) AS unpaid
      FROM rentals WHERE user_id = ?`).get(c.id);
    send(res, 200, {
      courier: { id: c.id, name: c.name, email: c.email, photo: c.photo, blocked: !!c.blocked, rating: c.rating, createdAt: c.created_at, ...stats },
      bikes,
    });
  }, ADMIN);

  route('PUT', /^\/api\/admin\/couriers\/(\d+)\/bikes\/(\d+)$/, async (req, res, user, [id, bikeId]) => {
    const b = await readJson(req);
    const c = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    if (!c || isAdmin(c)) throw new HttpError(404, 'Курьер не найден');
    if (!db.prepare('SELECT 1 FROM bikes WHERE id = ?').get(Number(bikeId))) throw new HttpError(404, 'Байк не найден');
    let rate = null;
    if (b.rate !== null && b.rate !== undefined && b.rate !== '') {
      rate = Number(b.rate);
      if (!Number.isInteger(rate) || rate < 1 || rate > 10000) throw new HttpError(400, 'Цена — целое число от 1 до 10 000 ₽');
    }
    const hidden = b.hidden ? 1 : 0;
    if (rate === null && !hidden) {
      db.prepare('DELETE FROM courier_bikes WHERE user_id = ? AND bike_id = ?').run(c.id, Number(bikeId));
    } else {
      db.prepare(`INSERT INTO courier_bikes (user_id, bike_id, rate, hidden) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, bike_id) DO UPDATE SET rate = excluded.rate, hidden = excluded.hidden`).run(c.id, Number(bikeId), rate, hidden);
    }
    send(res, 200, { ok: true });
  }, ADMIN);

  route('POST', '/api/admin/couriers', async (req, res) => {
    const b = await readJson(req);
    const name = str(b.name), email = str(b.email).toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
    if (!name) throw new HttpError(400, 'Укажите ФИО');
    if (!isEmail(email)) throw new HttpError(400, 'Некорректная почта');
    if (email === ADMIN_EMAIL) throw new HttpError(400, 'Это почта администратора');
    if (password.length < 6) throw new HttpError(400, 'Пароль — минимум 6 символов');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Эта почта уже зарегистрирована');
    const photo = b.photo ? parsePhoto(b.photo) : null;
    db.prepare('INSERT INTO users (name, email, password_hash, photo) VALUES (?, ?, ?, ?)')
      .run(name, email, hashPassword(password), photo);
    send(res, 201, { ok: true });
  }, ADMIN);

  route('PATCH', /^\/api\/admin\/couriers\/(\d+)$/, async (req, res, user, [id]) => {
    const b = await readJson(req);
    const c = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    if (!c || isAdmin(c)) throw new HttpError(404, 'Курьер не найден');
    const name = 'name' in b ? str(b.name) : c.name;
    if (!name) throw new HttpError(400, 'Укажите ФИО');
    const photo = 'photo' in b ? parsePhoto(b.photo) : c.photo;
    const blocked = 'blocked' in b ? (b.blocked ? 1 : 0) : c.blocked;
    let rating = c.rating;
    if ('rating' in b) {
      rating = b.rating === null ? null : Number(b.rating);
      if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) throw new HttpError(400, 'Рейтинг — от 1 до 10');
    }
    let hash = c.password_hash;
    if (b.password) {
      if (typeof b.password !== 'string' || b.password.length < 6) throw new HttpError(400, 'Пароль — минимум 6 символов');
      hash = hashPassword(b.password);
    }
    db.prepare('UPDATE users SET name = ?, photo = ?, blocked = ?, rating = ?, password_hash = ? WHERE id = ?')
      .run(name, photo, blocked, rating, hash, c.id);
    if (blocked || b.password) dropSessions(c.id);
    if (blocked) {
      db.prepare(`UPDATE rentals SET ended_at = ?, orders = 0, total = 0, pay_status = 'paid', closed_by_block = 1
        WHERE user_id = ? AND ended_at IS NULL`).run(now(), c.id);
    }
    send(res, 200, { ok: true });
  }, ADMIN);

  route('GET', '/api/admin/settings', (req, res) => {
    send(res, 200, { registrationOpen: registrationOpen() });
  }, ADMIN);

  route('PATCH', '/api/admin/settings', async (req, res) => {
    const b = await readJson(req);
    if ('registrationOpen' in b) setRegistrationOpen(b.registrationOpen);
    send(res, 200, { registrationOpen: registrationOpen() });
  }, ADMIN);
};

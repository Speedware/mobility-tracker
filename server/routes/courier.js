const { db, now } = require('../db');
const { REPAIR_PARTS, COMMENT_MAX, HISTORY_DAYS } = require('../config');
const { HttpError, send, readJson, str } = require('../lib/http');
const { bikeList, activeRental, personalTerms, effectiveRate, RENTAL_FIELDS, rentalRow } = require('../services/fleet');

module.exports = route => {
  route('GET', '/api/bikes', (req, res, user) => {
    send(res, 200, { bikes: bikeList(user.id), activeRental: activeRental(user.id) });
  });

  route('POST', '/api/rentals', async (req, res, user) => {
    const b = await readJson(req);
    const bike = db.prepare('SELECT * FROM bikes WHERE id = ?').get(Number(b.bikeId));
    const terms = personalTerms(user.id);
    if (!bike || bike.availability === 'hidden' || terms.get(bike.id)?.hidden) throw new HttpError(404, 'Байк не найден');
    if (bike.availability !== 'available') throw new HttpError(409, 'Байк сейчас недоступен');
    if (activeRental(user.id)) throw new HttpError(409, 'У вас уже есть активная аренда');
    if (db.prepare('SELECT 1 FROM rentals WHERE bike_id = ? AND ended_at IS NULL').get(bike.id)) {
      throw new HttpError(409, 'Этот байк уже арендован');
    }
    db.prepare('INSERT INTO rentals (user_id, bike_id, rate, started_at) VALUES (?, ?, ?, ?)')
      .run(user.id, bike.id, effectiveRate(bike, terms), now());
    send(res, 201, { activeRental: activeRental(user.id) });
  });

  route('POST', /^\/api\/rentals\/(\d+)\/finish$/, async (req, res, user, [id]) => {
    const b = await readJson(req);
    const orders = Number(b.orders);
    if (!Number.isInteger(orders) || orders < 0 || orders > 9999) throw new HttpError(400, 'Некорректное количество заказов');
    const r = db.prepare('SELECT * FROM rentals WHERE id = ? AND user_id = ? AND ended_at IS NULL').get(Number(id), user.id);
    if (!r) throw new HttpError(404, 'Активная аренда не найдена');
    db.prepare('UPDATE rentals SET ended_at = ?, orders = ?, total = ? WHERE id = ?').run(now(), orders, r.rate * orders, r.id);
    send(res, 200, { rental: db.prepare('SELECT * FROM rentals WHERE id = ?').get(r.id) });
  });

  route('GET', '/api/rentals', (req, res, user) => {
    const since = new Date(Date.now() - HISTORY_DAYS * 864e5).toISOString();
    const rows = db.prepare(`
      SELECT ${RENTAL_FIELDS} FROM rentals r JOIN bikes b ON b.id = r.bike_id
      WHERE r.user_id = ? AND (r.ended_at IS NULL OR r.started_at >= ?)
      ORDER BY r.started_at DESC`).all(user.id, since);
    send(res, 200, { rentals: rows.map(rentalRow) });
  });

  route('POST', '/api/repairs', async (req, res, user) => {
    const b = await readJson(req);
    const bike = db.prepare('SELECT id FROM bikes WHERE id = ?').get(Number(b.bikeId));
    if (!bike) throw new HttpError(404, 'Байк не найден');
    const parts = Array.isArray(b.parts) ? [...new Set(b.parts.filter(p => REPAIR_PARTS.includes(p)))] : [];
    const comment = str(b.comment, COMMENT_MAX);
    if (!parts.length) throw new HttpError(400, 'Выберите, что сломалось');
    if (!comment) throw new HttpError(400, 'Опишите поломку в комментарии');
    db.prepare('INSERT INTO repairs (user_id, bike_id, parts, comment, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, bike.id, JSON.stringify(parts), comment, now());
    send(res, 201, { ok: true });
  });
};

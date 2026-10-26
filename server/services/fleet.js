const { db } = require('../db');

function personalTerms(userId) {
  const rows = db.prepare('SELECT bike_id, rate, hidden FROM courier_bikes WHERE user_id = ?').all(userId);
  return new Map(rows.map(r => [r.bike_id, { rate: r.rate, hidden: !!r.hidden }]));
}

const effectiveRate = (bike, terms) => terms.get(bike.id)?.rate ?? bike.rate;

function bikeList(userId, { includeHidden = false, personal = true } = {}) {
  const bikes = db.prepare('SELECT * FROM bikes ORDER BY sort, id').all();
  const terms = personal ? personalTerms(userId) : new Map();
  const active = db.prepare(`
    SELECT r.bike_id, r.user_id, r.started_at, u.name AS user_name
    FROM rentals r JOIN users u ON u.id = r.user_id WHERE r.ended_at IS NULL`).all();
  const repairs = db.prepare(`
    SELECT r.*, u.name AS user_name FROM repairs r JOIN users u ON u.id = r.user_id
    WHERE r.resolved_at IS NULL ORDER BY r.created_at DESC`).all();
  return bikes.map(b => {
    const rental = active.find(a => a.bike_id === b.id);
    const mine = !!rental && rental.user_id === userId;
    if (b.availability === 'hidden' && !includeHidden && !mine) return null;
    if (terms.get(b.id)?.hidden && !mine) return null;
    return {
      id: b.id, name: b.name, speed: b.speed, battery: b.battery, rate: effectiveRate(b, terms),
      image: `/assets/bikes/${b.image}`,
      availability: b.availability,
      busy: !!rental,
      mine,
      rental: rental ? { userName: rental.user_name, startedAt: rental.started_at } : null,
      repairs: repairs.filter(r => r.bike_id === b.id).map(r => ({
        id: r.id, parts: JSON.parse(r.parts), comment: r.comment,
        createdAt: r.created_at, userName: r.user_name,
      })),
    };
  }).filter(Boolean);
}

function activeRental(userId) {
  const r = db.prepare(`
    SELECT id, bike_id, rate, started_at FROM rentals
    WHERE user_id = ? AND ended_at IS NULL`).get(userId);
  return r ? { id: r.id, bikeId: r.bike_id, rate: r.rate, startedAt: r.started_at } : null;
}

const RENTAL_FIELDS = `r.id, b.name AS bike, r.rate, r.started_at AS startedAt, r.ended_at AS endedAt,
  r.orders, r.total, r.pay_status AS payStatus, r.closed_by_block AS closedByBlock`;
const rentalRow = r => ({ ...r, closedByBlock: !!r.closedByBlock });

module.exports = { bikeList, activeRental, personalTerms, effectiveRate, RENTAL_FIELDS, rentalRow };

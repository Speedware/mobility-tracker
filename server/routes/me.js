const { db } = require('../db');
const { HttpError, send, readJson, str, isEmail, parsePhoto } = require('../lib/http');
const { hashPassword, checkPassword, publicUser, sessionToken, dropSessions } = require('../lib/auth');
const { activeRental } = require('../services/fleet');

module.exports = route => {
  route('GET', '/api/me', (req, res, user) => {
    send(res, 200, { user: publicUser(user), activeRental: activeRental(user.id) });
  });

  route('PATCH', '/api/me', async (req, res, user) => {
    const b = await readJson(req);
    const name = 'name' in b ? str(b.name) : user.name;
    const email = 'email' in b ? str(b.email).toLowerCase() : user.email;
    const photo = 'photo' in b ? parsePhoto(b.photo) : user.photo;
    if (!name) throw new HttpError(400, 'Укажите ФИО');
    if (!isEmail(email)) throw new HttpError(400, 'Некорректная почта');
    if (db.prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?').get(email, user.id)) {
      throw new HttpError(409, 'Эта почта уже занята');
    }
    db.prepare('UPDATE users SET name = ?, email = ?, photo = ? WHERE id = ?').run(name, email, photo, user.id);
    send(res, 200, { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  });

  route('POST', '/api/me/password', async (req, res, user) => {
    const b = await readJson(req);
    if (typeof b.current !== 'string' || !checkPassword(b.current, user.password_hash)) {
      throw new HttpError(400, 'Текущий пароль указан неверно');
    }
    if (typeof b.next !== 'string' || b.next.length < 6) throw new HttpError(400, 'Новый пароль — минимум 6 символов');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(b.next), user.id);
    dropSessions(user.id, sessionToken(req));
    send(res, 200, { ok: true });
  });
};

const { db, registrationOpen } = require('../db');
const { ADMIN_EMAIL } = require('../config');
const { HttpError, send, readJson, str, isEmail } = require('../lib/http');
const { hashPassword, checkPassword, isAdmin, signIn, signOut } = require('../lib/auth');

module.exports = route => {
  route('GET', '/api/config', (req, res) => {
    send(res, 200, { registrationOpen: registrationOpen() });
  }, { public: true });

  route('POST', '/api/register', async (req, res) => {
    const b = await readJson(req);
    const name = str(b.name), email = str(b.email).toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
    if (!name) throw new HttpError(400, 'Укажите ФИО');
    if (!isEmail(email)) throw new HttpError(400, 'Некорректная почта');
    if (password.length < 6) throw new HttpError(400, 'Пароль — минимум 6 символов');
    if (!registrationOpen() && email !== ADMIN_EMAIL) throw new HttpError(403, 'Регистрация сейчас закрыта');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Эта почта уже зарегистрирована');
    const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, hashPassword(password));
    signIn(res, db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid), 201);
  }, { public: true });

  route('POST', '/api/login', async (req, res) => {
    const b = await readJson(req);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(str(b.email).toLowerCase());
    if (!user || typeof b.password !== 'string' || !checkPassword(b.password, user.password_hash)) {
      throw new HttpError(401, 'Неверная почта или пароль');
    }
    if (user.blocked) throw new HttpError(403, 'Учётная запись заблокирована');
    if (b.admin && !isAdmin(user)) throw new HttpError(403, 'Нет доступа к панели управления');
    signIn(res, user);
  }, { public: true });

  route('POST', '/api/logout', (req, res) => signOut(req, res), { public: true });
};

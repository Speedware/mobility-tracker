const crypto = require('node:crypto');
const { db, now } = require('../db');
const { ADMIN_EMAIL, SESSION_DAYS } = require('../config');
const { send } = require('./http');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function checkPassword(password, stored) {
  const [, saltHex, hashHex] = stored.split('$');
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

const sessionToken = req => /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '')?.[1] || null;
const isHttps = req => req.headers['x-forwarded-proto'] === 'https';
const sessionCookie = (req, token, maxAge) =>
  `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

function currentUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  return db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ? AND u.blocked = 0`).get(token, now()) || null;
}

const isAdmin = u => !!u && u.email.toLowerCase() === ADMIN_EMAIL;
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, photo: u.photo, rating: u.rating ?? null, isAdmin: isAdmin(u) });

function signIn(req, res, user, status = 200) {
  send(res, status, { user: publicUser(user) }, {
    'Set-Cookie': sessionCookie(req, createSession(user.id), SESSION_DAYS * 86400),
  });
}

function signOut(req, res) {
  const token = sessionToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
}

function dropSessions(userId, keepToken = '') {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(userId, keepToken || '');
}

module.exports = {
  hashPassword, checkPassword, sessionToken, currentUser, isAdmin, publicUser, signIn, signOut, dropSessions,
};

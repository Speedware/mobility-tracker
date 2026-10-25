const { BODY_MAX, PHOTO_MAX } = require('../config');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > BODY_MAX) throw new HttpError(413, 'Слишком большой запрос');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Некорректный JSON'); }
}

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function parsePhoto(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(value)) {
    throw new HttpError(400, 'Некорректное фото');
  }
  if (value.length > PHOTO_MAX) throw new HttpError(413, 'Фото слишком большое');
  return value;
}

module.exports = { HttpError, send, readJson, str, isEmail, parsePhoto };

const http = require('node:http');
const { PORT, HOST } = require('./config');
const { HttpError, send } = require('./lib/http');
const { createRouter } = require('./lib/router');
const { serveStatic } = require('./lib/static');

const api = createRouter();
require('./routes/auth')(api.route);
require('./routes/me')(api.route);
require('./routes/courier')(api.route);
require('./routes/admin')(api.route);

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) return await api.handle(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Ошибка сервера' });
  }
}).listen(PORT, HOST, () => console.log(`Мобилити: http://localhost:${PORT}/app  ·  панель: http://localhost:${PORT}/admin`));

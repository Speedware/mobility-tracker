const { HttpError } = require('./http');
const { currentUser, isAdmin } = require('./auth');

function createRouter() {
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => routes.push({ method, pattern, handler, ...opts });

  async function handle(req, res, pathname) {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const params = typeof r.pattern === 'string'
        ? (r.pattern === pathname ? [] : null)
        : r.pattern.exec(pathname)?.slice(1);
      if (!params) continue;
      const user = currentUser(req);
      if (!r.public && !user) throw new HttpError(401, 'Нужно войти в аккаунт');
      if (r.admin && !isAdmin(user)) throw new HttpError(403, 'Доступ только для владельца');
      return r.handler(req, res, user, params);
    }
    throw new HttpError(404, 'Не найдено');
  }

  return { route, handle };
}

module.exports = { createRouter };

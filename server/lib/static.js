const fs = require('node:fs');
const path = require('node:path');
const { PUBLIC_DIR, UPLOADS_DIR } = require('../config');
const { send } = require('./http');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json',
};

const ENTRIES = [
  { prefix: '/app', file: 'app.html' },
  { prefix: '/admin', file: 'admin.html' },
];

const entryFor = pathname => ENTRIES.find(e => pathname === e.prefix || pathname.startsWith(`${e.prefix}/`));

function renderEntry(file) {
  return fs.readFileSync(file, 'utf8').replace(/(href|src)="(\/(?:(?:css|js|icons|assets)\/[^"?]+|manifest\.webmanifest))"/g, (m, attr, url) => {
    const target = path.join(PUBLIC_DIR, url);
    const v = fs.existsSync(target) ? Math.floor(fs.statSync(target).mtimeMs) : 0;
    return `${attr}="${url}?v=${v}"`;
  });
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') {
    res.writeHead(302, { Location: '/app' });
    return res.end();
  }

  const entry = entryFor(pathname);
  if (entry && !path.extname(pathname)) {
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
    return res.end(renderEntry(path.join(PUBLIC_DIR, entry.file)));
  }

  const uploads = pathname.startsWith('/uploads/');
  const root = uploads ? UPLOADS_DIR : PUBLIC_DIR;
  const file = path.normalize(path.join(root, decodeURIComponent(uploads ? pathname.slice('/uploads'.length) : pathname)));
  if (!file.startsWith(root + path.sep)) return send(res, 403, { error: 'Forbidden' });
  const stat = fs.existsSync(file) && fs.statSync(file);
  if (!stat || !stat.isFile()) return send(res, 404, { error: 'Не найдено' });

  const lastModified = stat.mtime.toUTCString();
  const ext = path.extname(file);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.png' ? 'public, max-age=86400' : 'no-cache',
    'Last-Modified': lastModified,
  };
  if (req.headers['if-modified-since'] === lastModified) {
    res.writeHead(304, headers);
    return res.end();
  }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

module.exports = { serveStatic };

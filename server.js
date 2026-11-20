import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDist } from './build.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');

await buildDist();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(compression({ level: 6, threshold: 1024 }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://formsubmit.co; form-action 'self' https://formsubmit.co; object-src 'none'; base-uri 'self'"
  );
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const CLEAN_ROUTES = Object.freeze({
  '/': 'index.html',
  '/logistique': 'logistique.html',
  '/sourcing': 'sourcing.html',
  '/conseil': 'conseil.html',
  '/a-propos': 'a-propos.html',
  '/contact': 'contact.html',
  '/mentions-legales': 'mentions-legales.html',
  '/merci': 'merci.html',
});

const BLOCKED_EXACT = new Set([
  '/server.js',
  '/build.mjs',
  '/package.json',
  '/package-lock.json',
  '/bun.lock',
  '/readme.md',
]);

const BLOCKED_PREFIXES = ['/node_modules', '/dist', '/v2', '/v3', '/.'];

app.use((req, res, next) => {
  const lower = req.path.toLowerCase();

  if (
    BLOCKED_EXACT.has(lower) ||
    BLOCKED_PREFIXES.some((p) => lower.startsWith(p)) ||
    (lower.startsWith('/src/') && !lower.startsWith('/src/assets/images/')) ||
    (lower.startsWith('/public/assets/aistudio/') && lower.endsWith('.html')) ||
    lower.endsWith('.map')
  ) {
    return res.status(404).end();
  }

  const query = req.url.slice(req.path.length);

  if (lower === '/index' || lower === '/index.html') {
    return res.redirect(301, '/' + query);
  }

  if (lower.endsWith('.html')) {
    const clean = req.path.slice(0, -5);
    if (Object.prototype.hasOwnProperty.call(CLEAN_ROUTES, clean)) {
      return res.redirect(301, clean + query);
    }
    return res.status(404).end();
  }

  if (req.path.length > 1 && req.path.endsWith('/')) {
    return res.redirect(301, req.path.slice(0, -1) + query);
  }

  next();
});

const STATIC_IMMUTABLE = {
  maxAge: '365d',
  immutable: true,
  etag: true,
  index: false,
  fallthrough: false,
};

const STATIC_BUNDLE = {
  maxAge: '7d',
  etag: true,
  index: false,
  fallthrough: false,
};

app.use('/css', express.static(path.join(DIST_DIR, 'css'), STATIC_BUNDLE));
app.use('/js', express.static(path.join(DIST_DIR, 'js'), STATIC_BUNDLE));
app.use('/assets', express.static(path.join(__dirname, 'assets'), STATIC_IMMUTABLE));
app.use('/images', express.static(path.join(__dirname, 'images'), STATIC_IMMUTABLE));
app.use('/src/assets/images', express.static(path.join(__dirname, 'src', 'assets', 'images'), STATIC_IMMUTABLE));
app.use('/public/assets/aistudio', express.static(path.join(__dirname, 'public', 'assets', 'aistudio'), STATIC_IMMUTABLE));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'llms.txt'));
});

app.get('/llms-full.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'llms-full.txt'));
});

for (const [route, fileName] of Object.entries(CLEAN_ROUTES)) {
  app.get(route, (req, res) => {
    const target = path.join(DIST_DIR, fileName);
    if (!fs.existsSync(target)) {
      return res.status(404).end();
    }
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    res.sendFile(target);
  });
}

app.use((req, res) => {
  res.status(404).setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`HMG Global Business Solutions server running at http://${HOST}:${PORT}`);
});

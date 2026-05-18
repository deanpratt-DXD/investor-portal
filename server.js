// Minimal static file server for the investor portal.
// - gzip/brotli compression on the wire (huge win on the smaller HTML decks
//   and ~28% off the 2.4MB CUAS bundle).
// - Cache-Control on static assets so repeat tab activations / revisits are instant.
// - Preserves the serve.json semantics we relied on:
//     * root "/" rewrites to /index.html
//     * directory listing disabled
//     * extensions are NOT auto-stripped (we want /Foo.html to mean /Foo.html)
//     * directories serve their /index.html

const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

const app = express();
const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE;

// --- Auth config -----------------------------------------------------------
// ACCESS_CODE and DECK_ACCESS_CODE are loaded from Google Secret Manager in
// Cloud Run, or supplied as local environment variables during development.
const ACCESS_CODE = process.env.ACCESS_CODE || '';
const DECK_ACCESS_CODE = process.env.DECK_ACCESS_CODE || '';
const SESSION_SECRET = process.env.SESSION_SECRET
  || (IS_PROD ? '' : crypto.randomBytes(32).toString('hex')); // ephemeral in local dev only
const COOKIE_NAME = 'dxd_portal_auth';
const DECK_COOKIE_NAME = 'dxd_deck_auth';
const CSRF_COOKIE_NAME = 'dxd_portal_csrf';
const DECK_FILE = 'DxD Investor Deck - New _standalone_.html';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_MAX = 5; // 5 attempts per window per IP

if (!ACCESS_CODE || !DECK_ACCESS_CODE || !SESSION_SECRET) {
  throw new Error('ACCESS_CODE, DECK_ACCESS_CODE, and SESSION_SECRET must be set');
}

// Cloud Run sits behind a Google front-end; trust the proxy so req.ip is the
// real client IP (needed for rate-limit keying and `secure` cookies).
app.set('trust proxy', 1);

// Baseline browser hardening. CSP allows this legacy static portal's inline
// scripts/styles and same-origin tabs while still blocking object embeds,
// external framing, and rogue forms.
function applySecurityHeaders(req, res, next) {
  const directives = [
    "default-src 'self' data: blob: https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:",
    "style-src 'self' 'unsafe-inline' blob: https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' blob: https:",
    "frame-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ];
  res.set('Content-Security-Policy', directives.join('; '));
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
}

// Defense-in-depth: tell every crawler / unfurler to ignore everything we
// serve, even non-HTML assets and pages where someone forgot the meta tag.
function applyNoIndexHeaders(_req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
}

app.use(applySecurityHeaders);
app.use(applyNoIndexHeaders);

// gzip everything compressible above ~1KB.
app.use(compression({ threshold: 1024 }));
app.use(cookieParser(SESSION_SECRET));
app.use(express.json({ limit: '4kb' }));
app.use(express.urlencoded({ extended: false, limit: '4kb' }));

app.use((err, _req, res, next) => {
  if (!err) return next();
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, message: 'Malformed JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, message: 'Request body too large.' });
  }
  return next(err);
});

// Cache policy.
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.endsWith('.html') || p === '/' || p === '/deck' || p.endsWith('/')) {
    res.set('Cache-Control', 'private, max-age=0, must-revalidate');
  } else if (/\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico|css|js|mjs|map)$/.test(p)) {
    res.set('Cache-Control', 'public, max-age=604800, immutable');
  }
  next();
});

// --- Auth helpers ----------------------------------------------------------
function hasSignedAuthCookie(req, cookieName) {
  const v = req.signedCookies && req.signedCookies[cookieName];
  return v === 'ok';
}

function isAuthed(req) {
  return hasSignedAuthCookie(req, COOKIE_NAME);
}

function isDeckAuthed(req) {
  return hasSignedAuthCookie(req, DECK_COOKIE_NAME);
}

function canAccessDeck(req) {
  return isAuthed(req) || isDeckAuthed(req);
}

function setSignedAuthCookie(res, cookieName) {
  res.cookie(cookieName, 'ok', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    signed: true,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function setAuthCookie(res) {
  setSignedAuthCookie(res, COOKIE_NAME);
}

function setDeckAuthCookie(res) {
  setSignedAuthCookie(res, DECK_COOKIE_NAME);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/', httpOnly: true, secure: IS_PROD, sameSite: 'lax' });
  res.clearCookie(DECK_COOKIE_NAME, { path: '/', httpOnly: true, secure: IS_PROD, sameSite: 'lax' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/', httpOnly: true, secure: IS_PROD, sameSite: 'strict' });
}

function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Still run a constant-time compare against itself to avoid early-out timing.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    signed: true,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function requireCsrf(req, res, next) {
  const cookieToken = req.signedCookies && req.signedCookies[CSRF_COOKIE_NAME];
  const headerToken = req.get('x-csrf-token') || '';
  if (!cookieToken || !headerToken || !timingSafeEqualStr(cookieToken, headerToken)) {
    return res.status(403).json({ ok: false, message: 'Invalid CSRF token.' });
  }
  return next();
}

function logSecurityEvent(req, event, fields = {}) {
  console.info(JSON.stringify({
    event,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
    ...fields,
  }));
}

function handleAccessCodeLogin(req, res) {
  const submitted = (req.body && (req.body.password || req.body.code)) || '';

  const portalMatch = submitted && timingSafeEqualStr(submitted, ACCESS_CODE);
  const deckMatch = submitted && timingSafeEqualStr(submitted, DECK_ACCESS_CODE);

  if (portalMatch) {
    setAuthCookie(res);
    logSecurityEvent(req, 'login_success', { accessLevel: 'portal' });
    return res.json({ ok: true, redirectTo: '/' });
  }

  if (deckMatch) {
    setDeckAuthCookie(res);
    logSecurityEvent(req, 'deck_login_success', { accessLevel: 'deck' });
    return res.json({ ok: true, redirectTo: '/deck' });
  }

  // Failure: report how many attempts remain in this window.
  // express-rate-limit decrements `remaining` AFTER this handler returns, so
  // the value here reflects what the *next* call will see.
  const rl = req.rateLimit || { remaining: RATE_MAX - 1, resetTime: new Date(Date.now() + RATE_WINDOW_MS) };
  const remaining = Math.max(0, rl.remaining);
  const retryAfterMs = Math.max(0, rl.resetTime.getTime() - Date.now());
  logSecurityEvent(req, 'login_failed', { attemptsRemaining: remaining, retryAfterMs });
  return res.status(401).json({
    ok: false,
    locked: false,
    attemptsRemaining: remaining,
    retryAfterMs,
    message: 'Incorrect access code.',
  });
}

// --- Rate limiter for auth attempts ---------------------------------------
// 5 attempts per 5 minutes per client IP. Successful logins do NOT consume a
// slot, so a correct password never gets you locked out.
const loginLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const resetMs = Math.max(0, (req.rateLimit && req.rateLimit.resetTime ? req.rateLimit.resetTime.getTime() : Date.now() + RATE_WINDOW_MS) - Date.now());
    logSecurityEvent(req, 'login_rate_limited', { retryAfterMs: resetMs });
    res.status(429).json({
      ok: false,
      locked: true,
      attemptsRemaining: 0,
      retryAfterMs: resetMs,
      message: 'Too many attempts. Try again later.',
    });
  },
});

// --- Public auth endpoints -------------------------------------------------
app.get(['/healthz', '/_healthz', '/api/healthz'], (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.get('/api/csrf', (_req, res) => {
  const csrfToken = createCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.json({ csrfToken });
});

app.post('/api/login', requireCsrf, loginLimiter, (req, res) => {
  return handleAccessCodeLogin(req, res);
});

app.post('/api/logout', requireCsrf, (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth-status', (req, res) => {
  res.json({ authed: isAuthed(req) });
});

app.get('/api/deck-auth-status', (req, res) => {
  res.json({ authed: canAccessDeck(req) });
});

// --- Auth gate -------------------------------------------------------------
// Requests that don't carry the auth cookie get redirected (for navigations)
// or 401'd (for everything else). A small allow-list keeps the login page,
// its assets, and the auth endpoints reachable while signed out.
const PUBLIC_PATHS = new Set([
  '/login.html',
  '/dxd-logo-white.png',
  '/favicon.ico',
  '/robots.txt',
]);

function isPublicPath(p) {
  if (PUBLIC_PATHS.has(p)) return true;
  if (p.startsWith('/api/')) return true; // /api/login, /api/logout, /api/auth-status
  return false;
}

app.get(['/deck', '/deck/'], (req, res, next) => {
  if (!canAccessDeck(req)) {
    return res.redirect(302, '/login.html');
  }
  return res.sendFile(path.join(ROOT, DECK_FILE), err => {
    if (err) next(err);
  });
});

app.use((req, res, next) => {
  if (isPublicPath(req.path)) return next();
  if (isAuthed(req)) return next();

  // Unauthenticated. For document-style requests, redirect to /login.html so
  // the user sees the form. For asset-style requests, return 401 so iframes
  // and fetches don't accidentally render the login page in place of content.
  const accept = String(req.get('accept') || '');
  const p = req.path.toLowerCase();
  const looksLikeNav = p === '/' || p.endsWith('/') || p.endsWith('.html');
  const isHtmlNav = req.method === 'GET' && (accept.includes('text/html') || looksLikeNav);
  if (isHtmlNav) {
    return res.redirect(302, '/login.html');
  }
  return res.status(401).send('Unauthorized');
});

// Root rewrite (only reached when authed).
app.get('/', (_req, res, next) => {
  res.sendFile(path.join(ROOT, 'index.html'), err => {
    if (err) next(err);
  });
});

// Static files.
app.use(express.static(ROOT, {
  index: 'index.html',
  redirect: true,
  dotfiles: 'ignore',
  fallthrough: true,
}));

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, message: 'Not found.' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/') || String(req.get('accept') || '').includes('application/json')) {
    return res.status(404).json({ ok: false, message: 'Not found.' });
  }
  return res.status(404).type('text/plain').send('Not found');
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const rawStatus = err && (err.status || err.statusCode);
  const statusCode = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  logSecurityEvent(req, 'server_error', {
    statusCode,
    message: err && err.message ? String(err.message).slice(0, 240) : 'Unknown server error',
  });
  if (req.path.startsWith('/api/') || String(req.get('accept') || '').includes('application/json')) {
    return res.status(statusCode).json({ ok: false, message: 'Internal server error.' });
  }
  return res.status(statusCode).type('text/plain').send('Internal server error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`investor-portal listening on 0.0.0.0:${PORT}`);
});

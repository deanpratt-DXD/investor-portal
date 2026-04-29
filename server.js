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

// --- Auth config -----------------------------------------------------------
// ACCESS_CODE is loaded from Google Secret Manager and injected as an env var
// by Cloud Run. SESSION_SECRET signs the auth cookie. Both fall back to local
// dev defaults so `npm start` works without GCP.
const ACCESS_CODE = process.env.ACCESS_CODE || 'dxd2026';
const SESSION_SECRET = process.env.SESSION_SECRET
  || crypto.randomBytes(32).toString('hex'); // ephemeral if unset
const COOKIE_NAME = 'dxd_portal_auth';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_MAX = 5; // 5 attempts per window per IP
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE;

// Cloud Run sits behind a Google front-end; trust the proxy so req.ip is the
// real client IP (needed for rate-limit keying and `secure` cookies).
app.set('trust proxy', 1);

// gzip everything compressible above ~1KB.
app.use(compression({ threshold: 1024 }));
app.use(cookieParser(SESSION_SECRET));
app.use(express.json({ limit: '4kb' }));
app.use(express.urlencoded({ extended: false, limit: '4kb' }));

// Defense-in-depth: tell every crawler / unfurler to ignore everything we
// serve, even non-HTML assets and pages where someone forgot the meta tag.
app.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});

// Cache policy.
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.endsWith('.html') || p === '/' || p.endsWith('/')) {
    res.set('Cache-Control', 'private, max-age=0, must-revalidate');
  } else if (/\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico|css|js|mjs|map)$/.test(p)) {
    res.set('Cache-Control', 'public, max-age=604800, immutable');
  }
  next();
});

// --- Auth helpers ----------------------------------------------------------
function isAuthed(req) {
  const v = req.signedCookies && req.signedCookies[COOKIE_NAME];
  return v === 'ok';
}

function setAuthCookie(res) {
  res.cookie(COOKIE_NAME, 'ok', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    signed: true,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
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

// --- Rate limiter for /api/login ------------------------------------------
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
app.post('/api/login', loginLimiter, (req, res) => {
  const submitted = (req.body && (req.body.password || req.body.code)) || '';
  if (submitted && timingSafeEqualStr(submitted, ACCESS_CODE)) {
    setAuthCookie(res);
    return res.json({ ok: true });
  }
  // Failure: report how many attempts remain in this window.
  // express-rate-limit decrements `remaining` AFTER this handler returns, so
  // the value here reflects what the *next* call will see.
  const rl = req.rateLimit || { remaining: RATE_MAX - 1, resetTime: new Date(Date.now() + RATE_WINDOW_MS) };
  const remaining = Math.max(0, rl.remaining);
  const retryAfterMs = Math.max(0, rl.resetTime.getTime() - Date.now());
  return res.status(401).json({
    ok: false,
    locked: false,
    attemptsRemaining: remaining,
    retryAfterMs,
    message: 'Incorrect access code.',
  });
});

app.post('/api/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth-status', (req, res) => {
  res.json({ authed: isAuthed(req) });
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
app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// Static files.
app.use(express.static(ROOT, {
  index: 'index.html',
  redirect: true,
  dotfiles: 'ignore',
  fallthrough: true,
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`investor-portal listening on 0.0.0.0:${PORT}`);
});

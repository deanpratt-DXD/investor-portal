# Investor Portal Replication Guide

This file is a complete handoff for recreating the Deus X Defense investor portal application pattern with different content. It describes the application architecture, visual design, security model, GCP deployment, file structure, implementation details, and verification steps another coding agent would need to reproduce the portal cleanly.

The intent is to replicate the application shell and security approach, not the specific investor content.

---

## 1. What This Application Is

The portal is a secure, static-content investor portal served by a small Node/Express application.

At a high level:

- `server.js` is the runtime server.
- `index.html` is the authenticated portal shell.
- Individual content pages are standalone HTML files loaded inside an iframe.
- `login.html` is the unauthenticated sign-in screen.
- The access password is not stored in HTML, JavaScript, or CSS delivered to the browser.
- The shared access code is stored in Google Secret Manager and injected into Cloud Run as an environment variable.
- A signed, HttpOnly, Secure cookie is set after successful login.
- Failed login attempts are rate-limited server-side.
- The portal is hosted on Google Cloud Run behind the existing domain/load-balancer setup.

This architecture is designed for investor/private-document portals where the content is mostly static, the audience is small, and a shared access code is acceptable. It is stronger than a client-side password gate, but it is not a full per-user identity system. For high-security or regulated access, use Google Identity-Aware Proxy, Cloudflare Access, or another identity provider.

---

## 2. Current Reference Implementation

The reference application lives in a repo structured like this:

```text
investor-portal/
  .github/
    workflows/
      deploy.yml
  server.js
  package.json
  package-lock.json
  index.html
  login.html
  ceo-letter.html
  deus-x-defense.html
  deus-x-defense-v2.html
  team.html
  the-story.html
  the-origin.html
  product.html
  atlas.html
  financials.html
  traction.html
  appendix.html
  data-room.html
  v4.html
  dxd-logo-white.png
  ...other standalone or legacy HTML files
```

The live reference behavior:

- Unauthenticated `GET /` redirects to `/login.html`.
- Unauthenticated content page requests, such as `/financials.html`, redirect to `/login.html`.
- `login.html` is public and contains the sign-in UI.
- `POST /api/login` checks the submitted password server-side.
- On success, the server sets a signed cookie named `dxd_portal_auth`.
- Authenticated `GET /` returns `index.html`.
- `index.html` builds a tab bar and loads content pages into iframes.
- The password does not appear in the HTML source of `login.html` or `index.html`.

---

## 3. Security Model

### 3.1 Security Goal

Move the shared password out of browser-delivered HTML and into server-side infrastructure.

The previous client-side gate pattern looked like this:

```js
const ACCESS_CODE = "example-password";
```

That is not secure because anyone can view source, inspect JavaScript, or search network-loaded files and recover the password.

The replicated application must not store the access code in:

- `index.html`
- `login.html`
- client-side JavaScript
- CSS
- static JSON
- public assets
- frontend environment variables bundled into browser code

### 3.2 Secret Storage

Use Google Secret Manager:

- Secret name: `portal-access-code`
- Value: the chosen shared portal password
- Secret name: `portal-session-secret`
- Value: random 32-byte or longer secret used to sign cookies

Cloud Run injects the secrets at runtime as environment variables:

```text
ACCESS_CODE=portal-access-code:latest
SESSION_SECRET=portal-session-secret:latest
```

Never commit the real access code or session secret to git.

For a new portal, generate a session secret with:

```bash
openssl rand -hex 32
```

### 3.3 Login Endpoint

The server exposes:

```text
POST /api/login
```

Expected request:

```json
{
  "password": "submitted password"
}
```

Success response:

```json
{
  "ok": true
}
```

Failure response:

```json
{
  "ok": false,
  "locked": false,
  "attemptsRemaining": 4,
  "retryAfterMs": 300000,
  "message": "Incorrect access code."
}
```

Lockout response:

```json
{
  "ok": false,
  "locked": true,
  "attemptsRemaining": 0,
  "retryAfterMs": 299000,
  "message": "Too many attempts. Try again later."
}
```

### 3.4 Password Comparison

Compare the submitted password to `process.env.ACCESS_CODE` server-side using a timing-safe comparison.

Recommended Node helper:

```js
function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}
```

### 3.5 Auth Cookie

On successful login, set a signed cookie:

```js
res.cookie('dxd_portal_auth', 'ok', {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  signed: true,
  maxAge: 1000 * 60 * 60 * 12,
  path: '/',
});
```

Cookie requirements:

- `HttpOnly`: JavaScript cannot read it.
- `Secure`: sent only over HTTPS in production.
- `SameSite=Lax`: protects against most cross-site form usage while preserving normal navigation.
- `signed`: prevents trivial client-side tampering.
- Reasonable TTL: current reference uses 12 hours.

For local development, `secure` can be false if running over `http://localhost`, but production must set `secure: true`.

### 3.6 Rate Limiting

Implement server-side login rate limiting:

- 5 failed attempts per 5 minutes per IP.
- Successful login attempts should not consume the limit.
- Attempt 4 should tell the client there is one attempt remaining.
- Attempt 5 should fail and report `attemptsRemaining: 0`.
- Attempt 6 within the same window should return `429` and `locked: true`.

Recommended package:

```bash
npm install express-rate-limit
```

Recommended config:

```js
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const resetMs = Math.max(
      0,
      (req.rateLimit?.resetTime?.getTime() || Date.now() + 5 * 60 * 1000) - Date.now()
    );
    res.status(429).json({
      ok: false,
      locked: true,
      attemptsRemaining: 0,
      retryAfterMs: resetMs,
      message: 'Too many attempts. Try again later.',
    });
  },
});
```

### 3.7 Middleware Protection

All portal files must be protected by middleware except:

- `/login.html`
- `/api/login`
- `/api/logout`
- `/api/auth-status`
- favicon/logo assets needed by the login page, such as `/dxd-logo-white.png`
- optionally `/robots.txt`

Unauthenticated document-style requests should redirect to `/login.html`.

Asset/API-style requests should return `401` unless intentionally public.

Current reference intentionally redirects `.html` paths to `/login.html` even if the `Accept` header is unusual, because users and shared links should see the login screen rather than a bare 401.

### 3.8 Logout

Expose:

```text
POST /api/logout
```

It clears the signed cookie:

```js
res.clearCookie('dxd_portal_auth', { path: '/' });
res.json({ ok: true });
```

A visible logout button is optional. The reference server supports the endpoint even if the UI does not surface it prominently.

### 3.9 Security Limitations

This approach is appropriate for a shared-password private portal. It is not equivalent to per-user authentication.

Known limitations:

- Anyone with the shared password can access the portal.
- Access cannot be revoked per user unless the shared password is rotated.
- Users can share the password.
- A valid cookie can be used until expiration unless the session secret rotates.
- Rate limiting is per visible client IP; proxies and shared networks may group users.

For higher security, replace the shared password with:

- Google Identity-Aware Proxy
- Cloudflare Access
- Okta/Auth0/Entra ID
- Signed invite links with per-user records
- Server-side sessions backed by Redis/Firestore

---

## 4. Server Implementation

### 4.1 Dependencies

Required packages:

```json
{
  "dependencies": {
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.6",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0"
  }
}
```

Install:

```bash
npm install express compression cookie-parser express-rate-limit
```

### 4.2 Server Responsibilities

`server.js` should:

1. Start an Express server.
2. Enable compression.
3. Parse signed cookies.
4. Parse JSON and form bodies.
5. Set cache headers.
6. Expose `/api/login`, `/api/logout`, `/api/auth-status`.
7. Protect all non-public routes.
8. Serve `/` as `index.html` for authenticated users.
9. Serve static files from the repo root.

### 4.3 Runtime Environment Variables

Required in production:

```text
ACCESS_CODE=<loaded from Secret Manager>
SESSION_SECRET=<loaded from Secret Manager>
NODE_ENV=production
PORT=<provided by Cloud Run>
```

Optional local dev:

```bash
ACCESS_CODE='local-password' SESSION_SECRET='local-dev-session-secret' PORT=3000 npm start
```

Important: for a new implementation, do not hardcode the real access code as a fallback in source. If you include a local fallback, make it obviously non-production, such as `local-dev-only`, and require production env vars before startup.

Recommended production guard:

```js
if (process.env.NODE_ENV === 'production' && (!process.env.ACCESS_CODE || !process.env.SESSION_SECRET)) {
  throw new Error('ACCESS_CODE and SESSION_SECRET are required in production');
}
```

### 4.4 Cache Headers

Use conservative cache headers for HTML because auth state matters and content changes with deploys:

```js
if (p.endsWith('.html') || p === '/' || p.endsWith('/')) {
  res.set('Cache-Control', 'private, max-age=0, must-revalidate');
}
```

Use longer caching for static assets:

```js
else if (/\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico|css|js|mjs|map)$/.test(p)) {
  res.set('Cache-Control', 'public, max-age=604800, immutable');
}
```

### 4.5 Trust Proxy

Cloud Run sits behind Google infrastructure. Configure Express:

```js
app.set('trust proxy', 1);
```

This helps `req.ip` and secure cookies behave correctly behind the load balancer/proxy.

---

## 5. Frontend Architecture

### 5.1 `login.html`

`login.html` is the only public HTML page.

It contains:

- Full-screen dark background.
- Animated radar/targeting visual.
- Deus X Defense logo text treatment.
- Large hero line: `THREATS DON'T WAIT.`
- A compact sign-in panel.
- Password field.
- Submit button.
- Error line.
- Modal for attempt warning and lockout countdown.

It does not contain:

- The access code.
- A password hash.
- Any client-side secret.
- The full portal content.

The login form posts to `/api/login` using `fetch`:

```js
const res = await fetch('/api/login', {
  method: 'POST',
  credentials: 'same-origin',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({ password: pwd.value }),
});
```

On success:

```js
window.location.replace('/');
```

### 5.2 Login Warning Modal

Behavior required by the reference implementation:

- First wrong attempt: inline error only.
- Second wrong attempt: inline error only.
- Third wrong attempt: inline error only.
- Fourth wrong attempt: modal warning saying the user has one more attempt before lockout.
- Fifth wrong attempt: lockout starts, modal shows countdown.
- Sixth attempt within the window: server returns 429 and lockout response.

The client should use the server's `attemptsRemaining` and `retryAfterMs` values, not maintain its own independent attempt counter.

Warning modal content should be direct and calm:

```text
One attempt remaining
You have one more attempt before access is locked for 5 minutes. Double-check the access code before submitting.
```

Lockout modal should show a countdown in `MM:SS` format and disable the form until the countdown expires.

### 5.3 `index.html`

`index.html` is the authenticated portal shell.

It contains:

- Header with brand/logo.
- Horizontal tab navigation.
- Main content area.
- JavaScript registry of tabs.
- Lazy iframe creation for each tab page.
- Hash-based navigation for shareable tab URLs.

It should not contain:

- Any login gate.
- Any password or access-code constant.
- Any `sessionStorage` auth bypass.
- Any hidden credential data.

The portal shell should assume the server has already authenticated the request.

### 5.4 Tab Registry Pattern

Use a central tab array in `index.html`:

```js
const TABS = [
  { id: 'investor', label: 'CEO Letter', src: 'ceo-letter.html' },
  { id: 'pitch', label: 'Deus X Defense', src: 'deus-x-defense.html' },
  { id: 'team', label: 'Team', src: 'team.html' },
  { id: 'financials', label: 'Financials', src: 'financials.html' },
  { id: 'dataroom', label: 'Data Room', src: 'data-room.html' }
];
```

For a new portal, replace the labels and source files with the new content pages.

Each tab button should:

- Be a `<button>`.
- Have `role="tab"`.
- Set `aria-selected`.
- Toggle an `.active` class.
- Update the URL hash.

Each iframe should:

- Be created lazily on first tab activation.
- Use `loading="lazy"`.
- Use `title` equal to the tab label.
- Be cached in memory after first creation so switching tabs is fast.

When switching tabs, only the active iframe should be visible.

### 5.5 Content Page Pattern

Each content page should be a standalone HTML file that can render independently once authenticated.

Recommended properties:

- Full HTML document, not a fragment.
- Self-contained CSS or shared CSS imported from a protected asset.
- No authentication logic.
- No password logic.
- No external scripts unless necessary.
- Responsive layout.
- Dark visual system matching portal shell.
- Keep content pages at repo root unless there is a good reason to nest.

Examples:

```text
overview.html
strategy.html
team.html
financials.html
appendix.html
data-room.html
```

Then map them in `index.html`.

---

## 6. Visual Design System

The reference portal is a dark, defense/critical-infrastructure themed investor portal. It should feel private, focused, premium, and operational, not like a public marketing landing page.

### 6.1 Design Principles

- First screen is the usable portal, not a marketing page.
- Strong dark background.
- Red accent for urgency and brand energy.
- Compact, legible navigation.
- Investor-facing pages should be readable and scannable.
- Avoid excessive decoration in content pages.
- Use visual motion only where it adds presence, such as the login radar.
- Keep UI dense enough for serious business content.
- Do not create nested card-heavy layouts unless the content requires comparison.

### 6.2 Color Palette

Reference colors:

```css
:root {
  --bg: #050505;
  --bg-2: #0b0b0c;
  --panel: rgba(255, 255, 255, 0.045);
  --panel-strong: rgba(255, 255, 255, 0.075);
  --line: rgba(255, 255, 255, 0.12);
  --line-strong: rgba(255, 255, 255, 0.20);
  --text: #f4f4f2;
  --muted: rgba(244, 244, 242, 0.68);
  --subtle: rgba(244, 244, 242, 0.46);
  --red: #D2232A;
  --red-bright: #FF1F3A;
  --red-soft: rgba(210, 35, 42, 0.16);
}
```

Login-specific colors:

```css
--login-bg: #000000;
--login-red: #C8102E;
--login-red-bright: #FF1F3A;
--login-red-soft: #FF506E;
--login-white: #FFFFFF;
```

### 6.3 Typography

Reference font stack:

```css
font-family: "Inter Tight", "Tomorrow", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

The current portal also imports:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700;800&family=Tomorrow:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap" rel="stylesheet">
```

Recommended type scale:

```css
:root {
  --font-display: "Tomorrow", "Inter Tight", system-ui, sans-serif;
  --font-body: "Inter Tight", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Menlo", "Consolas", monospace;
  --h1-size: clamp(36px, 5.2vw, 76px);
  --h2-size: clamp(28px, 3.4vw, 48px);
  --h3-size: clamp(20px, 2vw, 28px);
  --body-size: clamp(15px, 1.05vw, 17px);
}
```

For compact UI elements like tabs and buttons, use smaller text and uppercase letter spacing.

### 6.4 Portal Shell Layout

Recommended shell structure:

```html
<body>
  <header>
    <div class="brand">
      <img src="brand-logo-white.png" alt="" class="brand-logo" aria-hidden="true" />
      <span><strong>Brand Name</strong><span class="brand-tag"> · Investor Portal</span></span>
    </div>
    <nav class="tabs" id="tabs" role="tablist"></nav>
  </header>
  <main id="main">
    <div class="loading">Loading...</div>
  </main>
</body>
```

Header behavior:

- Fixed or sticky top bar.
- Dark translucent background.
- Bottom border.
- Brand on left.
- Scrollable tab rail on right or below depending on viewport.
- Keep tabs compact.

Main behavior:

- Fills the remaining viewport height.
- Contains iframes.
- Each iframe uses `width: 100%`, `height: 100%`, `border: 0`.
- Hide inactive iframes with `display: none` or opacity/visibility.

### 6.5 Tab Styling

Tabs should feel like a secure internal console:

```css
.tab {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04);
  color: rgba(244,244,242,0.72);
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
}

.tab.active {
  color: #fff;
  border-color: rgba(210,35,42,0.85);
  background: rgba(210,35,42,0.14);
}
```

### 6.6 Login Screen Design

The login page should be self-contained and visually memorable.

Required elements:

- Full-screen black background.
- SVG radar grid and sweep animation.
- Multiple tracked drone glyphs orbiting the radar center.
- Cursor-following reticle.
- Top logo text.
- Bottom hero text: `THREATS DON'T WAIT.` or equivalent brand line.
- Center sign-in panel.
- Red-accent border and button.
- Modal overlay for warning/lockout.

The login page should not explain the application or include marketing copy. It should simply authenticate the user.

### 6.7 Mobile Responsiveness

Requirements:

- Login panel width should be `min(360px, 90vw)`.
- Header tabs should horizontally scroll on small screens.
- Brand tag can hide or shrink on mobile.
- Iframes must fit viewport height.
- Content pages should be independently responsive.
- Avoid text overflow in buttons, cards, and nav tabs.

---

## 7. Content Replacement Guide

### 7.1 Intake Questions for a New Portal

Before changing files, the implementing agent should ask the user for these values. Keep the answers in one implementation note for the session.

```text
Brand / organization name:
Portal title shown in header:
Login hero line:
Logo file to use, if any:
Primary accent color:
Desired production URL / subdomain:
DNS provider where the domain is managed:
GCP project ID:
Cloud Run service name:
Region:
Shared access password:
Tabs needed, in exact order:
For each tab: display label, desired file name, source content, and whether it should be a deck/page/data-room style section.
```

If the user is not sure about tab names, propose a concise investor-portal default:

```text
1. Overview
2. Thesis
3. Product
4. Market
5. Team
6. Traction
7. Financials
8. Appendix
9. Data Room
```

For a more diligence-heavy portal, propose:

```text
1. CEO Letter
2. Company Overview
3. Product
4. Market
5. Team
6. Financials
7. Traction
8. Legal
9. Technical Diligence
10. Data Room
```

For an operational/customer portal, propose:

```text
1. Executive Summary
2. Solution
3. Deployment Plan
4. Security
5. Commercials
6. Timeline
7. Documents
```

### 7.2 How to Walk the User Through Tab Setup

Use this sequence with the user:

1. Ask: "What are the exact tabs you want, in order?"
2. Convert each tab label into a stable `id` and file name.
3. Confirm the mapping before editing.
4. Create one HTML file per tab.
5. Update the `TABS` array in `index.html`.
6. Smoke test every tab with an authenticated cookie.

Recommended naming rules:

- Use short tab labels: `Overview`, `Team`, `Financials`, `Data Room`.
- Use lowercase kebab-case file names: `overview.html`, `data-room.html`.
- Use lowercase simple IDs: `overview`, `team`, `financials`, `dataroom`.
- Do not use spaces in file names for new pages.
- Do not rename files after deploy unless you also update bookmarks/shared links.
- Avoid duplicate tab labels.

Example mapping table to confirm with the user:

| Order | Tab Label | ID | Source File | Notes |
|---|---|---|---|---|
| 1 | Overview | `overview` | `overview.html` | first tab / default |
| 2 | Product | `product` | `product.html` | product narrative |
| 3 | Financials | `financials` | `financials.html` | protected diligence page |
| 4 | Data Room | `dataroom` | `data-room.html` | documents / links |

Corresponding `TABS` array:

```js
const TABS = [
  { id: 'overview', label: 'Overview', src: 'overview.html' },
  { id: 'product', label: 'Product', src: 'product.html' },
  { id: 'financials', label: 'Financials', src: 'financials.html' },
  { id: 'dataroom', label: 'Data Room', src: 'data-room.html' }
];
```

The first array item is the default tab when the user lands on `/` with no hash.

### 7.3 Updating `index.html` for New Tabs

In `index.html`, find the `TABS` array and replace it with the user's confirmed mapping.

Do not add auth logic to the tab code. Auth is handled by `server.js` before `index.html` is served.

The tab activation logic should continue to:

- Create each iframe lazily.
- Cache created iframes in a `Map`.
- Toggle `.active` on the tab button.
- Toggle `.active` on the iframe.
- Reflect the selected tab in `location.hash`.
- Use tab IDs in the hash, not file names.

Example share links after setup:

```text
https://portal.example.com/#overview
https://portal.example.com/#financials
https://portal.example.com/#dataroom
```

### 7.4 Creating New Content Files

For every tab in the `TABS` array, create a matching HTML file at the repo root.

Example:

```text
overview.html
product.html
financials.html
data-room.html
```

Each page should be a full HTML document:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Overview</title>
</head>
<body>
  <!-- page content -->
</body>
</html>
```

For a fast replication, use the content page skeleton in section 13.2.

### 7.5 Content Replacement Summary

To host different content while preserving the application:

1. Keep `server.js`, `login.html`, `package.json`, and deployment workflow pattern.
2. Replace the content HTML files.
3. Edit the `TABS` array in `index.html`.
4. Update brand text/logo in `index.html` and `login.html`.
5. Update theme colors if needed.
6. Deploy with the same security model.

Example replacement:

```js
const TABS = [
  { id: 'overview', label: 'Overview', src: 'overview.html' },
  { id: 'market', label: 'Market', src: 'market.html' },
  { id: 'product', label: 'Product', src: 'product.html' },
  { id: 'team', label: 'Team', src: 'team.html' },
  { id: 'financials', label: 'Financials', src: 'financials.html' },
  { id: 'dataroom', label: 'Data Room', src: 'data-room.html' }
];
```

Do not add tab content directly inside `index.html`. Keep each tab as a separate file so:

- Files stay manageable.
- Initial load stays small.
- Each tab can be edited independently.
- Large decks do not block portal shell render.

---

## 8. GCP Setup

### 8.0 GCP Infrastructure Blueprint

The complete GCP deployment has these components:

```text
GitHub repo
  -> GitHub Actions deploy workflow
  -> Google Cloud Build / Buildpacks
  -> Artifact Registry image
  -> Cloud Run service
  -> Secret Manager secrets mounted as env vars
  -> Optional HTTPS load balancer / custom domain
  -> DNS records at the user's DNS provider
```

Minimum infrastructure:

- One GCP project.
- One Cloud Run service.
- One runtime service account for Cloud Run.
- Two Secret Manager secrets: `portal-access-code`, `portal-session-secret`.
- One GitHub Actions deploy identity or service account.
- One public URL: either default Cloud Run URL, direct Cloud Run domain mapping, or HTTPS load balancer custom domain.

Recommended production infrastructure:

- Cloud Run service with app-level auth enabled.
- Secret Manager for password/session secret.
- External HTTPS Application Load Balancer with managed certificate.
- Custom subdomain, such as `investor.example.com`.
- Optional: disable default Cloud Run URL or restrict ingress to `internal-and-cloud-load-balancing` when using the load balancer.

### 8.0.1 GCP / DNS Intake Questions

Ask the user these questions before running infrastructure commands:

```text
What GCP project ID should host this portal?
What region should Cloud Run use? Default recommendation: us-east4.
What should the Cloud Run service be named?
What production URL do you want? Example: investor.company.com.
Where is DNS managed? Example: Cloudflare, GoDaddy, Squarespace, Route 53, Google Cloud DNS.
Can you edit DNS records, or should I provide records for someone else to add?
Do you want the simpler direct Cloud Run domain mapping or the stronger load balancer setup?
Should the default Cloud Run URL remain usable, or should traffic only enter through the custom domain/load balancer?
What shared access password should be stored in Secret Manager?
Should the first password match an existing one for continuity, or should we generate a stronger new one?
```

Recommended answer path:

- Use a subdomain like `investor.company.com`, not the apex/root domain.
- Use HTTPS only.
- Use the load balancer path if the portal is investor-facing and should have a polished custom URL.
- Use direct Cloud Run domain mapping only if speed and simplicity matter more than load-balancer control.
- Store password in Secret Manager.
- Do not put the password in GitHub Actions secrets unless using it only to create/update Secret Manager.

### 8.1 Required GCP Services

Enable:

```bash
gcloud services enable run.googleapis.com --project PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project PROJECT_ID
gcloud services enable compute.googleapis.com --project PROJECT_ID
```

If using a load balancer/custom domain, also ensure required Compute APIs are enabled.

For new projects, also confirm billing is enabled. Cloud Run deploys and load balancers will fail without billing.

### 8.2 Create Secrets

Use placeholders below. Do not paste real secrets into a public log.

```bash
PROJECT_ID="your-project-id"

printf 'YOUR_SHARED_ACCESS_CODE' | \
  gcloud secrets create portal-access-code \
    --project "$PROJECT_ID" \
    --replication-policy=automatic \
    --data-file=-

openssl rand -hex 32 | \
  gcloud secrets create portal-session-secret \
    --project "$PROJECT_ID" \
    --replication-policy=automatic \
    --data-file=-
```

If the secrets already exist, add versions instead:

```bash
printf 'NEW_SHARED_ACCESS_CODE' | \
  gcloud secrets versions add portal-access-code \
    --project "$PROJECT_ID" \
    --data-file=-

openssl rand -hex 32 | \
  gcloud secrets versions add portal-session-secret \
    --project "$PROJECT_ID" \
    --data-file=-
```

### 8.3 Determine Cloud Run Service Account

After creating or before updating the service:

```bash
PROJECT_ID="your-project-id"
SERVICE="your-cloud-run-service"
REGION="us-east4"

SA=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null)

if [ -z "$SA" ]; then
  SA="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
fi

echo "$SA"
```

### 8.4 Grant Secret Access

```bash
gcloud secrets add-iam-policy-binding portal-access-code \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$SA" \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding portal-session-secret \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$SA" \
  --role=roles/secretmanager.secretAccessor
```

### 8.5 Deploy to Cloud Run

```bash
gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production \
  --update-secrets=ACCESS_CODE=portal-access-code:latest,SESSION_SECRET=portal-session-secret:latest \
  --quiet
```

Important: `--allow-unauthenticated` is acceptable here only because the application itself performs server-side auth. If using IAP instead, the approach changes.

### 8.6 Custom Domain / Load Balancer

The reference app uses a custom domain in front of Cloud Run. For a new deployment, choose one of three URL patterns:

- Use the default Cloud Run URL, or
- Map a custom domain directly to Cloud Run, or
- Put Cloud Run behind an HTTPS load balancer.

### 8.6.1 URL Option A: Default Cloud Run URL

This is the quickest path for testing.

Deploy:

```bash
gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production \
  --update-secrets=ACCESS_CODE=portal-access-code:latest,SESSION_SECRET=portal-session-secret:latest \
  --quiet
```

Get URL:

```bash
gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)'
```

Use this for smoke testing before DNS is ready.

### 8.6.2 URL Option B: Direct Cloud Run Domain Mapping

Use this when the user wants a custom domain quickly and does not need a full HTTPS load balancer.

Best for:

- Simple portals.
- Small teams.
- Fast setup.
- No need to disable the default Cloud Run URL.

Set variables:

```bash
PROJECT_ID="your-project-id"
SERVICE="your-service-name"
REGION="us-east4"
DOMAIN="investor.example.com"
```

Create domain mapping:

```bash
gcloud beta run domain-mappings create \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service "$SERVICE" \
  --domain "$DOMAIN"
```

Fetch required DNS records:

```bash
gcloud beta run domain-mappings describe "$DOMAIN" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='yaml(status.resourceRecords)'
```

Then walk the user through DNS:

1. Open the DNS provider for the chosen domain.
2. Add the exact records returned by Google.
3. If Google returns a `CNAME`, add a CNAME for the subdomain.
4. If Google returns `A` / `AAAA` records, add those records exactly.
5. Remove conflicting records for the same hostname.
6. Wait for DNS propagation.
7. Wait for Google's managed certificate to become active.

Verify DNS:

```bash
dig +short "$DOMAIN"
dig +short CNAME "$DOMAIN"
```

Verify domain mapping status:

```bash
gcloud beta run domain-mappings describe "$DOMAIN" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='yaml(status.conditions,status.resourceRecords)'
```

Smoke test:

```bash
curl -I "https://$DOMAIN/"
curl -I "https://$DOMAIN/login.html"
```

Expected unauthenticated `/` response is `302` to `/login.html`.

### 8.6.3 URL Option C: HTTPS Load Balancer + Serverless NEG

Use this for the most production-like setup.

Best for:

- Branded investor portal URL.
- More control over certificates, IP, redirects, and ingress.
- Optional ability to restrict Cloud Run ingress to the load balancer.
- Future WAF/Cloud Armor/CDN needs.

#### 8.6.3.1 Variables

```bash
PROJECT_ID="your-project-id"
SERVICE="your-service-name"
REGION="us-east4"
DOMAIN="investor.example.com"

NEG_NAME="$SERVICE-neg"
BACKEND_NAME="$SERVICE-backend"
URL_MAP_NAME="$SERVICE-url-map"
HTTP_REDIRECT_MAP_NAME="$SERVICE-http-redirect"
CERT_NAME="$SERVICE-cert"
HTTPS_PROXY_NAME="$SERVICE-https-proxy"
HTTP_PROXY_NAME="$SERVICE-http-proxy"
IP_NAME="$SERVICE-ip"
HTTPS_RULE_NAME="$SERVICE-https-rule"
HTTP_RULE_NAME="$SERVICE-http-rule"
```

#### 8.6.3.2 Create Serverless NEG

```bash
gcloud compute network-endpoint-groups create "$NEG_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --network-endpoint-type=serverless \
  --cloud-run-service "$SERVICE"
```

#### 8.6.3.3 Create Backend Service

```bash
gcloud compute backend-services create "$BACKEND_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTP
```

Attach the serverless NEG:

```bash
gcloud compute backend-services add-backend "$BACKEND_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --network-endpoint-group "$NEG_NAME" \
  --network-endpoint-group-region "$REGION"
```

#### 8.6.3.4 Create URL Map

```bash
gcloud compute url-maps create "$URL_MAP_NAME" \
  --project "$PROJECT_ID" \
  --default-service "$BACKEND_NAME"
```

#### 8.6.3.5 Reserve Static Global IP

```bash
gcloud compute addresses create "$IP_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --ip-version=IPV4

LB_IP=$(gcloud compute addresses describe "$IP_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --format='value(address)')

echo "$LB_IP"
```

Give this IP address to the user for DNS.

#### 8.6.3.6 Create Managed SSL Certificate

```bash
gcloud compute ssl-certificates create "$CERT_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --domains "$DOMAIN"
```

Certificate status will remain provisioning until DNS points to the load balancer IP.

Check status:

```bash
gcloud compute ssl-certificates describe "$CERT_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --format='value(managed.status,managed.domainStatus)'
```

#### 8.6.3.7 Create HTTPS Proxy and Forwarding Rule

```bash
gcloud compute target-https-proxies create "$HTTPS_PROXY_NAME" \
  --project "$PROJECT_ID" \
  --url-map "$URL_MAP_NAME" \
  --ssl-certificates "$CERT_NAME"

gcloud compute forwarding-rules create "$HTTPS_RULE_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address "$IP_NAME" \
  --target-https-proxy "$HTTPS_PROXY_NAME" \
  --ports 443
```

#### 8.6.3.8 Optional HTTP to HTTPS Redirect

Create a redirect URL map:

```bash
gcloud compute url-maps create "$HTTP_REDIRECT_MAP_NAME" \
  --project "$PROJECT_ID" \
  --default-url-redirect='https-redirect=True'
```

Create an HTTP proxy and forwarding rule:

```bash
gcloud compute target-http-proxies create "$HTTP_PROXY_NAME" \
  --project "$PROJECT_ID" \
  --url-map "$HTTP_REDIRECT_MAP_NAME"

gcloud compute forwarding-rules create "$HTTP_RULE_NAME" \
  --project "$PROJECT_ID" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address "$IP_NAME" \
  --target-http-proxy "$HTTP_PROXY_NAME" \
  --ports 80
```

If the `--default-url-redirect` syntax differs in the installed `gcloud` version, create the HTTP redirect in the Google Cloud Console under Load Balancing -> URL maps. The requirement is simple: HTTP port 80 redirects to HTTPS port 443.

#### 8.6.3.9 DNS Walkthrough for the User

Tell the user exactly what to do in their DNS provider:

```text
1. Open your DNS provider for example.com.
2. Find DNS records / zone editor.
3. Add or update this record:
   Type: A
   Name / Host: investor
   Value / IPv4 address: <LB_IP>
   TTL: Auto or 300 seconds
4. Remove any existing CNAME/A record for investor.example.com that points elsewhere.
5. Save.
6. Wait for propagation.
```

If the chosen URL is an apex domain like `example.com`, DNS is more provider-specific. Prefer a subdomain such as `investor.example.com`. If the user insists on apex, the DNS provider must support apex A records or ALIAS/ANAME records.

Verify DNS after the user updates records:

```bash
dig +short "$DOMAIN"
curl -I "http://$DOMAIN/"
curl -I "https://$DOMAIN/"
```

Expected:

- `dig` returns the load balancer IP.
- `http://` redirects to `https://` if HTTP redirect is configured.
- `https://` eventually returns the portal's `302` to `/login.html` once the cert is active.

#### 8.6.3.10 Restrict Cloud Run Ingress to the Load Balancer

After HTTPS through the load balancer works, optionally restrict direct access to Cloud Run:

```bash
gcloud run services update "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --ingress internal-and-cloud-load-balancing
```

This makes the custom domain/load balancer the intended public path.

If using direct Cloud Run domain mapping, do not use this setting unless you have verified the mapping still works.

#### 8.6.3.11 Optional: Disable Default Cloud Run URL

Some Cloud Run configurations support disabling the default `run.app` URL. If available in the current `gcloud` version, use the supported flag or console setting. Always verify after changing it:

```bash
gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='yaml(metadata.annotations,status.url,status.address)'
```

The reference deployment has the default URL disabled and ingress set to `internal-and-cloud-load-balancing`, with traffic entering through `https://investor.deusxdefense.com`.

### 8.6.4 DNS Provider Cheat Sheet

Cloudflare:

- For load balancer A record: Type `A`, Name `investor`, IPv4 address `<LB_IP>`.
- Start with proxy disabled / DNS-only until Google certificate is active.
- After certificate is active, Cloudflare proxy can be enabled if desired, but test carefully.

GoDaddy:

- DNS -> Records -> Add.
- Type `A`, Name `investor`, Value `<LB_IP>`, TTL default.
- Delete conflicting CNAME for the same host.

Squarespace:

- Domains -> DNS Settings -> Custom Records.
- Add A record for `investor` to `<LB_IP>`.
- DNS propagation can be slower; wait and re-check.

Route 53:

- Hosted zone -> Create record.
- Record name `investor`.
- Type `A`.
- Value `<LB_IP>`.
- TTL 300.

Google Cloud DNS:

```bash
gcloud dns record-sets transaction start --zone "$DNS_ZONE" --project "$PROJECT_ID"
gcloud dns record-sets transaction add "$LB_IP" \
  --zone "$DNS_ZONE" \
  --project "$PROJECT_ID" \
  --name "$DOMAIN." \
  --ttl 300 \
  --type A
gcloud dns record-sets transaction execute --zone "$DNS_ZONE" --project "$PROJECT_ID"
```

### 8.6.5 Custom Domain Completion Criteria

The domain setup is complete when:

- `dig +short DOMAIN` returns the expected load balancer IP or Google mapping target.
- Managed SSL certificate status is active.
- `curl -I https://DOMAIN/` returns `302` to `https://DOMAIN/login.html` when unauthenticated.
- `curl https://DOMAIN/login.html` returns the login page.
- `POST https://DOMAIN/api/login` with the correct password returns `{ "ok": true }`.
- Authenticated `GET https://DOMAIN/` returns `200`.
- Protected tab pages return `302` without a cookie and `200` with a cookie.

---

## 9. GitHub Actions Deployment

### 9.1 GitHub / GCP Deploy Identity

The reference workflow authenticates to Google Cloud with a GitHub secret named `GCP_SA_KEY` containing a service-account JSON key.

For a new portal, prefer Workload Identity Federation if the organization is comfortable setting it up. If speed matters, a JSON key works, but it must be treated as sensitive and rotated if exposed.

#### 9.1.1 Simple JSON-Key Deployment Setup

Set variables:

```bash
PROJECT_ID="your-project-id"
DEPLOY_SA_NAME="github-cloud-run-deployer"
DEPLOY_SA="$DEPLOY_SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
RUNTIME_SA="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
```

Create deploy service account:

```bash
gcloud iam service-accounts create "$DEPLOY_SA_NAME" \
  --project "$PROJECT_ID" \
  --display-name="GitHub Cloud Run deployer"
```

Grant deploy permissions:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role=roles/run.admin

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role=roles/cloudbuild.builds.editor

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role=roles/artifactregistry.admin

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role=roles/secretmanager.viewer
```

Allow the deployer to deploy Cloud Run revisions using the runtime service account:

```bash
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role=roles/iam.serviceAccountUser
```

Create the key:

```bash
gcloud iam service-accounts keys create gcp-sa-key.json \
  --project "$PROJECT_ID" \
  --iam-account "$DEPLOY_SA"
```

Then walk the user through GitHub:

```text
1. Open the GitHub repository.
2. Go to Settings -> Secrets and variables -> Actions.
3. Click New repository secret.
4. Name: GCP_SA_KEY
5. Value: paste the full contents of gcp-sa-key.json.
6. Save.
7. Delete the local gcp-sa-key.json file after saving it to GitHub.
```

Delete local key file:

```bash
rm -f gcp-sa-key.json
```

Important distinction:

- The deploy service account lets GitHub deploy the app.
- The Cloud Run runtime service account reads `portal-access-code` and `portal-session-secret` at runtime.
- Do not give the deploy service account more access than needed.

#### 9.1.2 Runtime Service Account Secret Access

The Cloud Run runtime service account needs:

```text
roles/secretmanager.secretAccessor
```

Grant it on both secrets:

```bash
gcloud secrets add-iam-policy-binding portal-access-code \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding portal-session-secret \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role=roles/secretmanager.secretAccessor
```

### 9.2 Workflow File

Reference workflow shape:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: your-project-id
  SERVICE: your-service-name
  REGION: us-east4

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy to Cloud Run (from source)
        run: |
          gcloud run deploy "$SERVICE" \
            --project "$PROJECT_ID" \
            --region "$REGION" \
            --source . \
            --allow-unauthenticated \
            --set-env-vars=NODE_ENV=production \
            --update-secrets=ACCESS_CODE=portal-access-code:latest,SESSION_SECRET=portal-session-secret:latest \
            --quiet
```

The critical part is preserving this flag on every deploy:

```bash
--update-secrets=ACCESS_CODE=portal-access-code:latest,SESSION_SECRET=portal-session-secret:latest
```

Without it, a future deploy can accidentally remove or fail to attach the secrets.

### 9.3 Post-Workflow Verification

After pushing to `main` or manually triggering the workflow:

1. Open GitHub Actions.
2. Confirm the deploy workflow completed successfully.
3. Confirm Cloud Run has a new revision.
4. Confirm the new revision is serving 100% traffic.
5. Run the smoke tests in section 10 against the chosen URL.

Commands:

```bash
gcloud run revisions list \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service "$SERVICE"

gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='yaml(status.traffic)'
```

If a workflow deploy succeeds but login fails, check:

- `--update-secrets` is present in the workflow.
- The runtime service account has `secretAccessor` on both secrets.
- `NODE_ENV=production` is set.
- `SESSION_SECRET` is stable and not being regenerated per instance.
- The app logs do not show missing environment variable errors.

---

## 10. Verification / Smoke Tests

After deploying, run tests against the live domain.

Set:

```bash
URL="https://your-domain.example.com"
CJ="/tmp/portal_cookie.txt"
rm -f "$CJ"
```

### 10.1 Unauthenticated Redirect

```bash
curl -sk -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" "$URL/"
```

Expected:

```text
HTTP 302 -> https://your-domain.example.com/login.html
```

### 10.2 Login Page Loads

```bash
curl -sk -o /dev/null -w "%{http_code}\n" "$URL/login.html"
```

Expected:

```text
200
```

### 10.3 Password Not in Public HTML

```bash
curl -sk "$URL/login.html" | grep -q 'YOUR_SHARED_ACCESS_CODE' && echo 'BAD' || echo 'good'
curl -sk -L "$URL/" | grep -q 'YOUR_SHARED_ACCESS_CODE' && echo 'BAD' || echo 'good'
```

Expected:

```text
good
good
```

Also search for stale client-side auth constants:

```bash
curl -sk "$URL/login.html" | grep -E 'ACCESS_CODE|STORAGE_KEY|const ACCESS_CODE' && echo 'BAD' || echo 'good'
```

Expected:

```text
good
```

### 10.4 Wrong Login Attempt

```bash
curl -sk -X POST \
  -H 'Content-Type: application/json' \
  -d '{"password":"wrong"}' \
  "$URL/api/login"
```

Expected first wrong attempt:

```json
{"ok":false,"locked":false,"attemptsRemaining":4,...}
```

### 10.5 Correct Login

```bash
curl -sk -c "$CJ" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_SHARED_ACCESS_CODE"}' \
  "$URL/api/login"
```

Expected:

```json
{"ok":true}
```

Verify cookie:

```bash
grep dxd_portal_auth "$CJ"
```

Expected:

- Cookie exists.
- Cookie is HttpOnly.
- Cookie is Secure on HTTPS production.

### 10.6 Authenticated Portal Loads

```bash
curl -sk -b "$CJ" -o /dev/null -w "%{http_code}\n" "$URL/"
```

Expected:

```text
200
```

### 10.7 Tab Pages Load with Cookie

```bash
for f in overview.html team.html financials.html data-room.html; do
  printf "%-24s " "$f"
  curl -sk -b "$CJ" -o /dev/null -w "%{http_code}\n" "$URL/$f"
done
```

Expected:

```text
200 for each protected content page
```

### 10.8 Tab Pages Block Without Cookie

```bash
curl -sk -o /dev/null -w "%{http_code}\n" "$URL/financials.html"
```

Expected:

```text
302
```

### 10.9 Auth Status

```bash
curl -sk "$URL/api/auth-status"
curl -sk -b "$CJ" "$URL/api/auth-status"
```

Expected:

```json
{"authed":false}
{"authed":true}
```

### 10.10 Rate Limit Behavior

Use a test environment or wait for reset after doing this, since it intentionally burns attempts:

```bash
for i in 1 2 3 4 5 6; do
  printf "attempt %s: " "$i"
  curl -sk -X POST \
    -H 'Content-Type: application/json' \
    -d '{"password":"wrong"}' \
    "$URL/api/login"
  echo
 done
```

Expected shape:

```text
attempt 1: attemptsRemaining 4
attempt 2: attemptsRemaining 3
attempt 3: attemptsRemaining 2
attempt 4: attemptsRemaining 1   <-- client modal warning
attempt 5: attemptsRemaining 0
attempt 6: locked true / HTTP 429 <-- lockout
```

---

## 10.11 Search Engine / Indexing Hardening

A private investor portal should not be indexed, cached, or previewed by search engines, social-media unfurlers, or AI crawlers. Even though everything behind the auth gate requires the cookie, the login URL itself is public and could leak the brand or context.

### 10.11.1 `robots.txt`

Create a top-level `robots.txt` that disallows all crawlers:

```text
User-agent: *
Disallow: /
```

Place this at the repo root. The reference `server.js` already allow-lists `/robots.txt` so it serves without auth.

Verify after deploy:

```bash
curl -sk https://your-domain.example.com/robots.txt
```

### 10.11.2 `noindex` Meta Tags

Add the following inside the `<head>` of every public-facing HTML file, especially `login.html`:

```html
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
<meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
```

Apply the same to `index.html` and every content/tab page so accidental link sharing does not leak metadata.

### 10.11.3 Optional `X-Robots-Tag` Header

In `server.js`, set a header on every response so even files without inline meta tags are covered:

```js
app.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});
```

Verify:

```bash
curl -sIk https://your-domain.example.com/login.html | grep -i x-robots-tag
```

### 10.11.4 No Open Graph / Twitter Cards

Do not include Open Graph (`og:title`, `og:image`) or Twitter Card metadata on the login page. They cause link-sharing previews in Slack, iMessage, LinkedIn, and Twitter to render the brand and any preview text. For a private portal:

- Omit all `og:*` tags.
- Omit all `twitter:*` tags.
- Omit a meaningful `<meta name="description">`. Either leave it out or set it to a generic placeholder.
- Use a generic `<title>` such as "Sign in" rather than the company name.

If brand visibility on shared links is desired anyway, include only minimal Open Graph tags and accept that the existence of the portal becomes public.

### 10.11.5 Smoke Test

After deploy:

```bash
URL="https://your-domain.example.com"
echo "robots.txt:"; curl -sk "$URL/robots.txt"; echo
echo "X-Robots-Tag header:"; curl -sIk "$URL/login.html" | grep -i x-robots-tag
echo "Inline meta in login.html:"; curl -sk "$URL/login.html" | grep -i 'name="robots"'
```

Expected:

- `robots.txt` returns the `Disallow: /` rule.
- `X-Robots-Tag` header is present on responses.
- `<meta name="robots">` is present in `login.html` head.

---

## 11. Accessibility Notes

Minimum requirements:

- Login form uses a real `<form>`.
- Password input has `aria-label="Access code"` or a visible label.
- Error region uses `role="alert"` and `aria-live="polite"`.
- Modal uses `role="dialog"` and `aria-modal="true"`.
- Modal has a title referenced by `aria-labelledby`.
- Focus moves to modal action button when modal opens.
- Keyboard users can submit the login form with Enter.
- Buttons are actual `<button>` elements.
- Tabs use `role="tablist"` and `role="tab"`.
- Active tab sets `aria-selected="true"`.

Nice-to-have improvements:

- Trap focus inside the modal.
- Close warning modal with Escape.
- Add a visible logout button.
- Add reduced-motion handling for all animations.

The reference login page already disables radar/reticle animations under `prefers-reduced-motion: reduce`.

---

## 12. Operational Notes

### 12.1 Password Rotation

To rotate the shared access code:

```bash
PROJECT_ID="your-project-id"
SERVICE="your-service-name"
REGION="us-east4"

printf 'NEW_SHARED_ACCESS_CODE' | \
  gcloud secrets versions add portal-access-code \
    --project "$PROJECT_ID" \
    --data-file=-

gcloud run services update "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --update-secrets=ACCESS_CODE=portal-access-code:latest
```

If Cloud Run already references `:latest`, a new revision/update is still useful to force refresh/runtime pickup.

### 12.2 Session Invalidation

To invalidate all existing cookies, rotate `portal-session-secret`:

```bash
openssl rand -hex 32 | \
  gcloud secrets versions add portal-session-secret \
    --project "$PROJECT_ID" \
    --data-file=-

gcloud run services update "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --update-secrets=SESSION_SECRET=portal-session-secret:latest
```

All users will need to log in again.

### 12.3 Logs

Useful commands:

```bash
gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION"

gcloud run revisions list --service "$SERVICE" --project "$PROJECT_ID" --region "$REGION"

gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE" \
  --project "$PROJECT_ID" \
  --limit=50 \
  --format='value(timestamp,textPayload)'
```

Do not log submitted passwords.

### 12.4 Git Hygiene

Before committing:

```bash
git status --short
git diff -- server.js login.html index.html package.json package-lock.json .github/workflows/deploy.yml
```

Search for accidental secrets:

```bash
rg -n "YOUR_SHARED_ACCESS_CODE|dxd2026|ACCESS_CODE\s*=\s*['\"]|SESSION_SECRET\s*=\s*['\"]" .
```

For a reusable/new portal, there should be no real password in tracked files.

---

## 13. Suggested Minimal File Templates

### 13.1 `package.json`

```json
{
  "name": "secure-static-portal",
  "version": "1.0.0",
  "private": true,
  "description": "Secure static portal with server-side shared access code auth.",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.6",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0"
  }
}
```

### 13.2 Content Page Skeleton

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Portal Section</title>
  <style>
    :root {
      --bg: #050505;
      --panel: rgba(255,255,255,0.05);
      --line: rgba(255,255,255,0.12);
      --text: #f4f4f2;
      --muted: rgba(244,244,242,0.68);
      --red: #D2232A;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); }
    body { font-family: "Inter Tight", system-ui, sans-serif; padding: clamp(24px, 5vw, 64px); }
    .kicker { color: var(--red); text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px; }
    h1 { font-size: clamp(36px, 5vw, 72px); line-height: 0.98; margin: 12px 0 20px; }
    p { max-width: 760px; color: var(--muted); line-height: 1.55; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 28px; }
    .card { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 18px; }
  </style>
</head>
<body>
  <div class="kicker">Section</div>
  <h1>Replace with content title.</h1>
  <p>Replace with section narrative.</p>
  <div class="grid">
    <div class="card">Key item</div>
    <div class="card">Key item</div>
    <div class="card">Key item</div>
  </div>
</body>
</html>
```

---

## 14. Common Mistakes to Avoid

- Do not put the password in `index.html`.
- Do not put a password hash in `index.html`; hashes can be cracked offline.
- Do not rely on `sessionStorage` for auth.
- Do not let protected HTML files be served before auth middleware runs.
- Do not forget to attach Secret Manager secrets during deploy.
- Do not let a future GitHub Actions deploy overwrite the Cloud Run secret bindings.
- Do not log passwords in request logs or console logs.
- Do not use broad public cache headers for authenticated HTML.
- Do not place all content into one huge `index.html`; use tab files.
- Do not assume iframe-loaded pages are protected by iframe usage alone. They must be protected server-side too.
- Do not test only the login page. Test direct access to content URLs without a cookie.

---

## 15. Completion Checklist

A replicated portal is complete when all of these are true:

- [ ] User confirmed brand name, production URL, DNS provider, GCP project, region, service name, password strategy, and tab list.
- [ ] Each requested tab has a confirmed label, ID, source file name, and content purpose.
- [ ] `index.html` `TABS` array matches the confirmed tab list in exact order.
- [ ] Every `src` file in the `TABS` array exists at the expected path.
- [ ] `server.js` enforces auth before static files are served.
- [ ] `login.html` contains no access code or hash.
- [ ] `index.html` contains no login gate, password, or auth bypass.
- [ ] `ACCESS_CODE` is loaded from Secret Manager.
- [ ] `SESSION_SECRET` is loaded from Secret Manager.
- [ ] Runtime service account has `roles/secretmanager.secretAccessor` on both secrets.
- [ ] GitHub deploy identity exists and can deploy Cloud Run from source.
- [ ] Cookie is signed, HttpOnly, Secure, and SameSite=Lax.
- [ ] Login attempts are rate-limited to 5 per 5 minutes.
- [ ] Attempt 4 shows a one-attempt-remaining modal.
- [ ] Lockout shows a 5-minute countdown modal.
- [ ] Direct unauthenticated requests to content pages redirect to `/login.html`.
- [ ] Authenticated requests to all tab pages return 200.
- [ ] Password cannot be found in fetched HTML source.
- [ ] GitHub Actions deploy includes `--update-secrets`.
- [ ] Chosen URL resolves in DNS to the expected Cloud Run mapping or load balancer IP.
- [ ] HTTPS certificate is active for the chosen URL.
- [ ] HTTP redirects to HTTPS if a load balancer is used.
- [ ] Cloud Run ingress matches the chosen URL pattern.
- [ ] Default Cloud Run URL is either intentionally left enabled or intentionally disabled/restricted.
- [ ] Smoke tests pass against the live domain.

---

## 16. Reference Smoke Test Command

Adapt the values at the top and run after deployment.

```bash
URL="https://your-domain.example.com"
PASSWORD="YOUR_SHARED_ACCESS_CODE"
CJ="/tmp/portal_cookie.txt"
rm -f "$CJ"

check() {
  desc="$1"
  expected="$2"
  actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $desc ($actual)"
  else
    echo "FAIL  $desc expected=$expected actual=$actual"
  fi
}

out=$(curl -sk -o /dev/null -w '%{http_code}|%{redirect_url}' "$URL/")
check "unauth / status" "302" "${out%%|*}"

check "login page" "200" "$(curl -sk -o /dev/null -w '%{http_code}' "$URL/login.html")"

check "password absent from login" "yes" "$(curl -sk "$URL/login.html" | grep -q "$PASSWORD" && echo no || echo yes)"

body=$(curl -sk -X POST -H 'Content-Type: application/json' -d '{"password":"wrong"}' "$URL/api/login")
echo "wrong login response: $body"

body=$(curl -sk -c "$CJ" -X POST -H 'Content-Type: application/json' -d "{\"password\":\"$PASSWORD\"}" "$URL/api/login")
echo "correct login response: $body"

check "cookie set" "yes" "$(grep -q dxd_portal_auth "$CJ" && echo yes || echo no)"
check "authed /" "200" "$(curl -sk -b "$CJ" -o /dev/null -w '%{http_code}' "$URL/")"
check "auth status" "yes" "$(curl -sk -b "$CJ" "$URL/api/auth-status" | grep -q '"authed":true' && echo yes || echo no)"

rm -f "$CJ"
```

---

## 17. Final Implementation Philosophy

Keep the application simple:

- Server-side auth gate.
- Static content pages.
- One portal shell.
- One login page.
- Secrets in Secret Manager.
- Small Node server.
- Repeatable Cloud Run deploy.

This gives another agent a durable pattern: private-content portal, strong enough shared-password protection, polished investor-facing UX, and minimal operational overhead.

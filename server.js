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
const path = require('path');

const app = express();
const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '3000', 10);

// gzip everything compressible above ~1KB. Threshold avoids overhead on tiny responses.
app.use(compression({ threshold: 1024 }));

// Cache policy:
//  - HTML decks change with deploys; allow short shared caching with revalidation.
//  - Fonts / images / svg / css / js change rarely; cache for a week.
//  - Anything else: opt out of caching to be safe.
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.endsWith('.html') || p === '/' || p.endsWith('/')) {
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
  } else if (/\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico|css|js|mjs|map)$/.test(p)) {
    res.set('Cache-Control', 'public, max-age=604800, immutable');
  }
  next();
});

// Root rewrite (was: serve.json `rewrites: [{ source: "/", destination: "/index.html" }]`)
app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// Static files. `index: 'index.html'` makes /CUAS/, /Product Walkthrough/, etc. resolve.
app.use(express.static(ROOT, {
  index: 'index.html',
  redirect: true,
  dotfiles: 'ignore',
  fallthrough: true,
  // express.static will set its own ETag/Last-Modified; our middleware above set Cache-Control.
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`investor-portal listening on 0.0.0.0:${PORT}`);
});

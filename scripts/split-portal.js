#!/usr/bin/env node
/*
 * One-shot splitter: takes the legacy `index 2.html` monolith and produces
 * 5 self-contained tab files (one per portal sub-tab) at the repo root.
 *
 * Each output file:
 *   - Reuses the same <head> as the source, but swaps the giant inline
 *     <style> block for a <link> to assets/portal.css (already extracted).
 *   - Contains a single <div class="tab-pane active" id="tab-X"> body.
 *   - Includes ALL footer <script> blocks from the source, so init
 *     functions (setupFinancials, initStory, etc.) keep working.
 *
 * After this runs and the outputs are verified, `index 2.html` can be
 * deleted.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'index 2.html');

const src = fs.readFileSync(SRC, 'utf8').split('\n');

// 1-indexed line numbers from the analysis we did earlier.
const HEAD_PRE_STYLE_END  = 39;    // last line before the giant <style> opens (line 40)
const HEAD_POST_STYLE_BEG = 7925;  // </head>  starts at 7925
const BODY_OPEN_LINE      = 7926;  // <body>
const PORTAL_DIV_LINE     = 7929;  // <div class="portal" id="portal">
const FOOTER_SCRIPT_BEG   = 14308; // first <script> after panes
const FILE_END            = src.length; // last line incl. </html>

// 1-indexed inclusive ranges for each pane <div class="tab-pane" id="tab-X">…</div>.
// End of one pane = (start of next pane) - 1.
const TABS = [
  { id: 'letter',     out: 'ceo-letter.html', start: 7949,  end: 8019  },
  { id: 'story',      out: 'the-story.html',  start: 10700, end: 12812 },
  { id: 'financials', out: 'financials.html', start: 13697, end: 13906 },
  { id: 'appendix',   out: 'appendix.html',   start: 13907, end: 14247 },
  { id: 'dataroom',   out: 'data-room.html',  start: 14248, end: 14293 },
];

// 1-indexed slice helper, inclusive on both ends.
const slice = (a, b) => src.slice(a - 1, b).join('\n');

// Pre-style head (charset, viewport, fonts, redirect, embedded toggle, the
// small embedded-mode <style>).
const headPre = slice(1, HEAD_PRE_STYLE_END);
// Post-style head tail (just the </head>).
const headPost = slice(HEAD_POST_STYLE_BEG, HEAD_POST_STYLE_BEG);

// All footer <script> blocks (and any trailing markup like </body></html>).
const footer = slice(FOOTER_SCRIPT_BEG, FILE_END);

for (const tab of TABS) {
  // Make the pane visible standalone by adding the .active class. Each
  // pane's opening line is `    <div class="tab-pane" id="tab-X">` — the
  // story pane is already `tab-pane active`, so the regex tolerates both.
  const paneLines = src.slice(tab.start - 1, tab.end);
  paneLines[0] = paneLines[0].replace(
    /class="tab-pane(?: active)?"/,
    'class="tab-pane active"'
  );
  const pane = paneLines.join('\n');

  const out = [
    headPre,
    '  <link rel="stylesheet" href="assets/portal.css">',
    headPost,
    '<body>',
    '',
    '<!-- PORTAL (single-tab standalone) -->',
    '<div class="portal" id="portal">',
    '  <div class="portal-content">',
    '',
    pane,
    '',
    '  </div><!-- /portal-content -->',
    '</div><!-- /portal -->',
    '',
    footer,
  ].join('\n');

  const outPath = path.join(ROOT, tab.out);
  fs.writeFileSync(outPath, out);
  console.log(`wrote ${tab.out} (${out.split('\n').length} lines)`);
}

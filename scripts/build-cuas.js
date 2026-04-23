#!/usr/bin/env node
// Build CUAS/index.html by patching the bundled briefing in place.
// Reads "DXD Counter-UAS Briefing.html", rewrites generic copy in both the
// embedded HTML template and the compressed text manifest entries, injects
// the Oswald + Figtree + JetBrains Mono font system, and writes the merged single-file
// artifact. Run again whenever the briefing is regenerated.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'DXD Counter-UAS Briefing.html');
const DEST = path.join(ROOT, 'CUAS', 'index.html');

const OUTER_TITLE = 'DXD · Counter-UAS · Critical Infrastructure';

const HEAD_INJECTION = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Figtree:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style id="dxd-font-standardization">
  :root {
    --dxd-font-display: "Oswald", "Bebas Neue", "Impact", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --dxd-font-body: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --dxd-font-mono: "JetBrains Mono", "Menlo", "Consolas", monospace;
    --dxd-h1-size: clamp(36px, 5.2vw, 76px);
    --dxd-h2-size: clamp(28px, 3.4vw, 48px);
    --dxd-h3-size: clamp(20px, 2vw, 28px);
    --dxd-h4-size: clamp(16px, 1.4vw, 20px);
    --dxd-body-size: clamp(15px, 1.05vw, 17px);
    --dxd-eyebrow-size: 12px;
    --dxd-h1-weight: 400;
    --dxd-h2-weight: 400;
    --dxd-h3-weight: 500;
    --dxd-h4-weight: 600;
    --dxd-h1-line: 0.98;
    --dxd-h2-line: 1.05;
    --dxd-h3-line: 1.15;
    --dxd-body-line: 1.55;
    --dxd-tracking-display: -0.02em;
    --dxd-tracking-eyebrow: 0.18em;
  }

  html, body, p, li, td, th, input, textarea, select, button, label,
  blockquote, figcaption, dd, dt {
    font-family: var(--dxd-font-body) !important;
    font-size: var(--dxd-body-size);
    line-height: var(--dxd-body-line);
  }

  h1, h2, h3, h4, h5, h6,
  .display, .headline, .hero-title, .section-title, .eyebrow, .nav-cta,
  .tab, .brand, .logo, .card-role {
    font-family: var(--dxd-font-display) !important;
    letter-spacing: var(--dxd-tracking-display);
  }

  h1, .display, .hero-title {
    font-size: var(--dxd-h1-size) !important;
    font-weight: var(--dxd-h1-weight) !important;
    line-height: var(--dxd-h1-line) !important;
  }

  h2, .section-title {
    font-size: var(--dxd-h2-size) !important;
    font-weight: var(--dxd-h2-weight) !important;
    line-height: var(--dxd-h2-line) !important;
  }

  h3 {
    font-size: var(--dxd-h3-size) !important;
    font-weight: var(--dxd-h3-weight) !important;
    line-height: var(--dxd-h3-line) !important;
  }

  h4 {
    font-size: var(--dxd-h4-size) !important;
    font-weight: var(--dxd-h4-weight) !important;
  }

  h5, h6 {
    font-size: var(--dxd-h4-size) !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .eyebrow, [class*="eyebrow"] {
    font-size: var(--dxd-eyebrow-size) !important;
    letter-spacing: var(--dxd-tracking-eyebrow) !important;
    text-transform: uppercase;
    font-weight: 500 !important;
  }

  code, pre, kbd, samp, tt, .mono, [class*="mono"] {
    font-family: var(--dxd-font-mono) !important;
  }

  .chrome-header .left .classifier + .classifier {
    display: none !important;
  }

  .pillar-grid .pillar:nth-child(4) {
    display: none !important;
  }

  @media (min-width: 980px) {
    .pillar-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
  }
</style>`;

const TEMPLATE_REPLACEMENTS = [
  ['DXD · Counter-UAS · Critical Infrastructure', OUTER_TITLE],
  ['Tier-1 Regional Sites', 'Tier-1 Richmond Sites'],
  ['Three Regional sites.', 'Three Richmond sites.'],
  ['generation complex at Site Alpha to the 2-acre urban distribution hub downtown.', 'generation complex at Chesterfield to the 2-acre urban distribution hub downtown.'],
  ['WMD Directorate · Local Field Office', 'WMD Directorate · Richmond Field Office'],
  ["agency: 'State Fusion Ctr.'", "agency: 'VA Fusion Center'"],
  ['RISSNET · Fusion SAR', 'RISSNET · VFC-SAR'],
  ["agency: 'State Police'", "agency: 'VA State Police'"],
  ['State CIN · encrypted radio', 'VCIN · encrypted radio'],
  ["agency: 'State EOC'", "agency: 'VA EOC'"],
  ["agency: 'County Sheriff'", "agency: 'Chesterfield Co.'"],
  ["unit: 'Patrol + CID'", "unit: 'Sheriff · Patrol + CID'"],
  ["agency: 'County E911'", "agency: 'Chesterfield Co.'"],
  ["unit: 'Emergency Communications · PSAP'", "unit: 'Emergency Communications · 911 PSAP'"],
  ["agency: 'Sector ISAC'", "agency: 'NERC E-ISAC'"],
  ["unit: 'Sector Information Sharing · Analysis'", "unit: 'Electricity Information Sharing · Analysis'"],
  ["channel: 'ISAC portal'", "channel: 'CRISP / E-ISAC portal'"],
  ["agency: 'Reliability Coord.'", "agency: 'PJM'"],
  ["channel: 'RC secure feed'", "channel: 'PJM OMS secure feed'"],
  ['Watch on. Site Alpha sector nominal. 21 sensors online. Coverage 100%.', 'Watch on. Chesterfield sector nominal. 21 sensors online. Coverage 100%.'],
  ['METAR 060654Z VRB03KT 10SM FEW250 06/M02 A3012 — flight conditions CAVOK.', 'METAR KRIC 060654Z VRB03KT 10SM FEW250 06/M02 A3012 — flight conditions CAVOK.'],
  ['DF-01 and DF-02 compute operator bearing. TDOA fusion fixes the pilot across the river on a public boat launch. Pilot marker drops on overview map with ±22 m CEP.', 'DF-01 and DF-02 compute operator bearing. TDOA fusion fixes the pilot on the James River east bank — public boat launch, Dutch Gap. Pilot marker drops on overview map with ±22 m CEP.'],
  ['Pilot fix · 37.3876°N 77.3724°W · ±22 m CEP · Public boat launch · public access', 'Pilot fix · 37.3876°N 77.3724°W · ±22 m CEP · Dutch Gap boat launch · public access'],
  ['Dispatch · County Sheriff to operator fix', 'Dispatch · Chesterfield County PD to operator fix'],
  ["sys: 'SHERIFF'", "sys: 'CCSO'"],
  ['Two patrol units dispatched · far-bank side · ETA 4 min · CAD Inc #2026-CI-0173', 'Two patrol units dispatched · Dutch Gap side · ETA 4 min · CAD Inc #2026-CHE-0173'],
  ['letter of agreement CI-LOA-04 active', 'letter of agreement CHE-LOA-04 active'],
  ['Unknown UAS operating over critical infrastructure — you are in restricted airspace under FAA TFR. Land immediately. Law enforcement is en route to your position at far-bank.', 'Unknown UAS operating over Chesterfield Power Station — you are in restricted airspace under FAA TFR. Land immediately. Law enforcement is en route to your position at Dutch Gap.'],
  ['Unknown UAS over critical infrastructure — restricted airspace under active FAA TFR. Land immediately and remain with your aircraft. County Sheriff is en route.', 'Unknown UAS over Chesterfield Power — restricted airspace under active FAA TFR. Land immediately and remain with your aircraft. Chesterfield County Sheriff is en route.'],
  ['TEAM PAGE · SHERIFF + DXD GROUND', 'TEAM PAGE · CCSO + DXD GROUND'],
  ['SITREP to Sheriff Patrol-1, Patrol-2, DXD ground team 3 · operator @ public boat launch · ±22 m · grey sedan suspect vehicle.', 'SITREP to CCSO Patrol-1, Patrol-2, DXD ground team 3 · operator @ Dutch Gap boat launch · ±22 m · grey sedan suspect vehicle.'],
  ['Response teams paged · Sheriff Patrol-1/2 · DXD Ground-3 · ETA sheriff 90s', 'Response teams paged · CCSO Patrol-1/2 · DXD Ground-3 · ETA sheriff 90s'],
  ['for prosecution and sector incident-reporting.', 'for prosecution and NERC CIP-008 reporting.'],
  ["from: 'SHERIFF-1'", "from: 'CCSO-1'"],
  ['COUNTY SHERIFF', 'CHESTERFIELD SHERIFF'],
  ['On scene public boat launch · subject cooperative · aircraft secured · starting interview.', 'On scene Dutch Gap boat launch · subject cooperative · aircraft secured · starting interview.'],
  ['RTB · mission recorder sealed · handing scene to Sheriff and FBI.', 'RTB · mission recorder sealed · handing scene to CCSO and FBI-RIC.'],
  ['Evidence bundle sealed · INC-2026-CI-0173 · SHA-256 committed', 'Evidence bundle sealed · INC-2026-CHE-0173 · SHA-256 committed'],
  ['Incident closed on airspace · sector incident report staged · no damage to assets · watch resumes nominal', 'Incident closed on airspace · NERC CIP-008 report staged · no damage to assets · watch resumes nominal'],
];

const TEXT_MIME_PATTERNS = [
  /^text\//i,
  /\bjavascript\b/i,
  /\bjson\b/i,
  /\bxml\b/i,
  /\bhtml\b/i,
  /\bcss\b/i,
  /\bsvg\b/i,
  /\bjsx\b/i,
  /\bbabel\b/i,
];

function isTextMime(mime) {
  if (!mime) return false;
  return TEXT_MIME_PATTERNS.some(re => re.test(mime));
}

function applyReplacements(input, hitTracker) {
  let output = input;
  for (const [search, replacement] of TEMPLATE_REPLACEMENTS) {
    if (!output.includes(search)) continue;
    output = output.split(search).join(replacement);
    if (hitTracker) hitTracker.add(search);
  }
  return output;
}

function escapeForScript(jsonString) {
  // Match the bundler's own escaping convention: never let </ end the host
  // <script> early. JSON.stringify already escapes embedded quotes/backslashes;
  // we just need the closing-tag guard.
  return jsonString.split('</').join('<\\/');
}

function injectFontBlock(templateHtml) {
  if (templateHtml.includes('id="dxd-font-standardization"')) return templateHtml;
  const headOpen = templateHtml.match(/<head[^>]*>/i);
  if (!headOpen) throw new Error('Could not locate <head> in bundled template');
  const insertAt = headOpen.index + headOpen[0].length;
  return templateHtml.slice(0, insertAt) + HEAD_INJECTION + templateHtml.slice(insertAt);
}

function rewriteManifest(manifestJsonRaw, hitTracker) {
  const manifest = JSON.parse(manifestJsonRaw);
  let entriesScanned = 0;
  let entriesRewritten = 0;

  for (const [uuid, entry] of Object.entries(manifest)) {
    if (!entry || !isTextMime(entry.mime) || typeof entry.data !== 'string') continue;
    entriesScanned += 1;

    let bytes = Buffer.from(entry.data, 'base64');
    if (entry.compressed) {
      try {
        bytes = zlib.gunzipSync(bytes);
      } catch (err) {
        console.warn(`  skip ${uuid}: gunzip failed (${err.message})`);
        continue;
      }
    }

    let text;
    try {
      text = bytes.toString('utf8');
    } catch (err) {
      console.warn(`  skip ${uuid}: utf8 decode failed (${err.message})`);
      continue;
    }

    const before = hitTracker.size;
    const rewritten = applyReplacements(text, hitTracker);
    if (rewritten === text) continue;

    let outBytes = Buffer.from(rewritten, 'utf8');
    if (entry.compressed) outBytes = zlib.gzipSync(outBytes);
    entry.data = outBytes.toString('base64');
    entriesRewritten += 1;
    const newHits = hitTracker.size - before;
    if (newHits > 0) {
      console.log(`  ${uuid} (${entry.mime}): +${newHits} replacement${newHits === 1 ? '' : 's'}`);
    }
  }

  console.log(`manifest: scanned ${entriesScanned} text entries, rewrote ${entriesRewritten}`);
  return JSON.stringify(manifest);
}

function patchScriptBlock(source, openTag, transform) {
  const openIdx = source.indexOf(openTag);
  if (openIdx === -1) throw new Error(`${openTag} not found`);
  const contentStart = openIdx + openTag.length;
  const closeIdx = source.indexOf('</script>', contentStart);
  if (closeIdx === -1) throw new Error(`closing </script> for ${openTag} not found`);
  const raw = source.slice(contentStart, closeIdx);
  const next = transform(raw);
  return source.slice(0, contentStart) + next + source.slice(closeIdx);
}

function patchTemplateBlock(source, hitTracker) {
  return patchScriptBlock(source, '<script type="__bundler/template">', rawJson => {
    const templateHtml = JSON.parse(rawJson);
    const withFont = injectFontBlock(templateHtml);
    const rewritten = applyReplacements(withFont, hitTracker);
    return escapeForScript(JSON.stringify(rewritten));
  });
}

function patchManifestBlock(source, hitTracker) {
  return patchScriptBlock(source, '<script type="__bundler/manifest">', rawJson =>
    escapeForScript(rewriteManifest(rawJson, hitTracker)),
  );
}

function patchOuterTitle(source) {
  return source.replace(
    /<title>DXD · Counter-UAS · Critical Infrastructure<\/title>/,
    `<title>${OUTER_TITLE}</title>`,
  );
}

function main() {
  const source = fs.readFileSync(SRC, 'utf8');
  const hits = new Set();

  let working = patchOuterTitle(source);
  working = patchTemplateBlock(working, hits);
  working = patchManifestBlock(working, hits);

  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, working);

  const stat = fs.statSync(DEST);
  const missed = TEMPLATE_REPLACEMENTS.map(([s]) => s).filter(s => !hits.has(s));
  console.log(`wrote ${path.relative(ROOT, DEST)} (${stat.size.toLocaleString()} bytes)`);
  console.log(`replacements applied: ${hits.size}/${TEMPLATE_REPLACEMENTS.length}`);
  if (missed.length) {
    console.warn(`WARNING: ${missed.length} replacement(s) did not match — briefing source may have changed:`);
    for (const s of missed) console.warn(`  - ${s.slice(0, 96)}${s.length > 96 ? '…' : ''}`);
    process.exitCode = 1;
  }
}

main();

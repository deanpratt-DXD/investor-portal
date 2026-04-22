// Hero + Context scenes
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ------------------------------------------------------------------
// HeroRadar — an interactive background radar scanner.
//
// A rotating sweep line continually paints the hero section. Two target
// "tracks" drift through airspace: a rogue drone bogey following a lazy
// figure-8, and the user's mouse cursor (rendered as a second contact).
// When the sweep arm crosses a track's angle, it paints the blip and the
// targeting reticle slews to lock.
// ------------------------------------------------------------------
function HeroRadar() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, inside: false });
  const reticleRef = useRef({ x: 0, y: 0, target: null, lock: 0 });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    let raf = null;
    let t0 = performance.now();

    // Bogey: figure-8 drifting drone, in [0,1] coords within the canvas.
    const bogey = { x: 0.5, y: 0.5, lastPaint: 0 };

    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.max(1, Math.floor(r.width * DPR));
      c.height = Math.max(1, Math.floor(r.height * DPR));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    // Mouse tracking — fold origin into canvas-local space.
    const onMove = (e) => {
      const r = c.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right ||
          e.clientY < r.top  || e.clientY > r.bottom) {
        mouseRef.current.inside = false;
        return;
      }
      mouseRef.current.x = (e.clientX - r.left);
      mouseRef.current.y = (e.clientY - r.top);
      mouseRef.current.inside = true;
    };
    const onLeave = () => { mouseRef.current.inside = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    // Persistent blip "paint" history per track, with decay.
    // Each entry: { x, y, age (ms since painted), kind: 'bogey'|'cursor' }
    let paints = [];

    const draw = (now) => {
      const dt = now - t0;
      const W = c.width, H = c.height;
      const cx = W / 2, cy = H / 2;
      const maxR = Math.min(W, H) * 0.48;

      // Sweep angle (rad) — 6s per rotation
      const sweepAng = (dt / 6000) * Math.PI * 2;

      // Move the bogey along a drifting figure-8.
      const u = dt / 12000;
      bogey.x = 0.5 + 0.30 * Math.sin(u * Math.PI * 2);
      bogey.y = 0.5 + 0.18 * Math.sin(u * Math.PI * 4);

      // Clear with fade so old paint dims naturally.
      ctx.fillStyle = 'rgba(8, 8, 14, 0.22)';
      ctx.fillRect(0, 0, W, H);

      // ---- Grid rings + crosshair ----
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(200,16,46,0.10)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, (maxR / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Cardinal + diagonal spokes (faint)
      ctx.strokeStyle = 'rgba(200,16,46,0.06)';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * maxR, Math.sin(a) * maxR);
        ctx.stroke();
      }
      ctx.restore();

      // ---- Sweep arm — a radial fade cone behind the leading edge ----
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweepAng);
      const grad = ctx.createConicGradient
        ? ctx.createConicGradient(0, 0, 0)
        : null;
      // Fallback without conic: a simple fading wedge
      const wedgeSteps = 40;
      for (let i = 0; i < wedgeSteps; i++) {
        const a0 = -0.55 * (i / wedgeSteps);
        const a1 = -0.55 * ((i + 1) / wedgeSteps);
        const alpha = 0.22 * (1 - i / wedgeSteps);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxR, a0, a1, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(200,16,46,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      // Leading edge — bright red line
      ctx.strokeStyle = 'rgba(255,80,110,0.85)';
      ctx.lineWidth = 1.5 * DPR;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxR, 0);
      ctx.stroke();
      ctx.restore();

      // ---- Compute tracks in canvas coords ----
      const tracks = [];
      const bx = bogey.x * W, by = bogey.y * H;
      tracks.push({ kind: 'bogey', x: bx, y: by, id: 'UAS-01', rssi: -58 });

      // Cursor is a live, continuously-tracked target — don't gate it on
      // the sweep arm. DPR scale the CSS coords into canvas-pixel coords.
      if (mouseRef.current.inside && mouseRef.current.x != null) {
        tracks.push({
          kind: 'cursor',
          x: mouseRef.current.x * DPR,
          y: mouseRef.current.y * DPR,
          id: 'TGT-02', rssi: -72,
        });
      }

      // When the sweep arm passes over the BOGEY, paint a fresh blip.
      // (The cursor doesn't need sweep-painting — reticle follows it live.)
      tracks.forEach(tr => {
        if (tr.kind !== 'bogey') return;
        const tAng = Math.atan2(tr.y - cy, tr.x - cx);
        let d = ((sweepAng - tAng) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (Math.abs(d) < 0.08 && now - (tr._lastPainted || 0) > 2000) {
          paints.push({ x: tr.x, y: tr.y, painted: now, kind: tr.kind, id: tr.id, rssi: tr.rssi });
          tr._lastPainted = now;
          bogey.lastPaint = now;
        }
      });

      // Decay old paints (full lifetime = one sweep cycle).
      paints = paints.filter(p => now - p.painted < 6000);

      // ---- Draw paints (persistent blips with decay) ----
      paints.forEach(p => {
        const age = (now - p.painted) / 6000;            // 0..1
        const a = Math.max(0, 1 - age);
        const color = p.kind === 'cursor' ? [80,180,255] : [255,80,110];
        // Outer halo ring (grows then fades — radar return)
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * DPR + age * 14 * DPR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(a*0.15).toFixed(3)})`;
        ctx.fill();
        // Blip dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * DPR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(a).toFixed(3)})`;
        ctx.fill();
      });

      // ---- Reticle — locks cursor if present, else latest bogey paint ----
      let bestTarget = null;
      const cursorTrack = tracks.find(t => t.kind === 'cursor');
      if (cursorTrack) {
        bestTarget = cursorTrack;          // live cursor tracking
      } else {
        // Most recent bogey paint (if any still fresh)
        let bestAge = 9e9;
        paints.forEach(p => {
          if (p.kind !== 'bogey') return;
          const age = now - p.painted;
          if (age < bestAge) { bestAge = age; bestTarget = p; }
        });
      }

      const r = reticleRef.current;
      if (bestTarget) {
        r.x += (bestTarget.x - r.x) * 0.18;
        r.y += (bestTarget.y - r.y) * 0.18;
        const dist = Math.hypot(bestTarget.x - r.x, bestTarget.y - r.y);
        const onTarget = dist < 8 * DPR ? 1 : 0;
        r.lock += (onTarget - r.lock) * 0.1;
        r.target = bestTarget;
      } else {
        r.lock += (0 - r.lock) * 0.05;
      }

      // Draw reticle
      if (r.target) {
        const size = 26 * DPR + (1 - r.lock) * 60 * DPR;   // closes as it locks
        const lockColor = r.target.kind === 'cursor' ? [80,180,255] : [255,80,110];
        const alpha = 0.45 + 0.55 * r.lock;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.strokeStyle = `rgba(${lockColor[0]},${lockColor[1]},${lockColor[2]},${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.5 * DPR;

        // Four corner brackets
        const s = size;
        const cLen = s * 0.35;
        // top-left
        ctx.beginPath();
        ctx.moveTo(-s, -s + cLen); ctx.lineTo(-s, -s); ctx.lineTo(-s + cLen, -s); ctx.stroke();
        // top-right
        ctx.beginPath();
        ctx.moveTo( s - cLen, -s); ctx.lineTo( s, -s); ctx.lineTo( s, -s + cLen); ctx.stroke();
        // bottom-right
        ctx.beginPath();
        ctx.moveTo( s,  s - cLen); ctx.lineTo( s,  s); ctx.lineTo( s - cLen,  s); ctx.stroke();
        // bottom-left
        ctx.beginPath();
        ctx.moveTo(-s + cLen,  s); ctx.lineTo(-s,  s); ctx.lineTo(-s,  s - cLen); ctx.stroke();

        // Crosshair at center
        ctx.strokeStyle = `rgba(${lockColor[0]},${lockColor[1]},${lockColor[2]},${(alpha*0.7).toFixed(3)})`;
        ctx.lineWidth = 1 * DPR;
        ctx.beginPath();
        ctx.moveTo(-s*0.15, 0); ctx.lineTo(s*0.15, 0);
        ctx.moveTo(0, -s*0.15); ctx.lineTo(0, s*0.15);
        ctx.stroke();

        // Lock indicator: TRACK → LOCK
        ctx.font = `${10*DPR}px ui-monospace, Menlo, monospace`;
        ctx.fillStyle = `rgba(${lockColor[0]},${lockColor[1]},${lockColor[2]},${alpha.toFixed(3)})`;
        ctx.textAlign = 'left';
        const labelY = -s - 6 * DPR;
        const label = r.lock > 0.75 ? '● LOCK' : '○ TRACK';
        ctx.fillText(label, -s, labelY);
        ctx.textAlign = 'right';
        ctx.fillText(`${r.target.id} · ${r.target.rssi} dBm`, s, labelY);

        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-radar-canvas"/>;
}

function HeroScene() {
  const [t, setT] = useState('');
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setT(d.toISOString().slice(0,19).replace('T',' ') + ' ZULU');
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section id="scene-hero" data-screen-label="01 Title">
      <div className="grid-bg" />
      <HeroRadar />
      <div className="hero-wrap">
        <div className="hero-top-meta">
          <span><span className="dash">■</span> DXD-SITREP / CUAS-2026-04</span>
          <span>CLASSIFICATION: UNCLASSIFIED // FOUO</span>
          <span>{t}</span>
        </div>

        <div className="eyebrow">Proposal · Counter-UAS Deployment · Regional Critical Infrastructure</div>
        <h1 className="hero-title" style={{marginTop: 16}}>
          THREATS DON'T<br/>
          WAIT FOR<br/>
          <span className="red">APPROVAL.</span>
        </h1>
        <p className="hero-sub">
          A unified counter-UAS perimeter for regional critical-infrastructure portfolios —
          engineered, staffed, and operated by Deus X Defense. Multi-sensor fusion,
          24/7 manned response, and automated orchestration to federal, state, and local
          agencies. FedRAMP and NDAA-compliant from day one.
        </p>

        <div className="hero-stats">
          <div className="s">
            <div className="num">3<span className="red">.</span></div>
            <div className="lbl">Tier-1 Regional Sites</div>
          </div>
          <div className="s">
            <div className="num">&lt;1<span className="red">s</span></div>
            <div className="lbl">Detection to C2 Alert</div>
          </div>
          <div className="s">
            <div className="num">24<span className="red">/</span>7</div>
            <div className="lbl">DXD SOC Coverage</div>
          </div>
          <div className="s">
            <div className="num">0</div>
            <div className="lbl">Grid Downtime Tolerance</div>
          </div>
        </div>

        <div className="hero-cta-row">
          <span className="arrow">▼</span>
          <span>Scroll to explore the deployment</span>
          <span style={{marginLeft: 'auto'}}>Prepared for: Asset-Owner CI Protection</span>
        </div>
      </div>
    </section>
  );
}

function ContextScene() {
  return (
    <section className="scene" style={{padding: '120px 0'}} data-screen-label="02 Threat Context">
      <div className="ctx-wrap">
        <div className="eyebrow">The Threat Environment</div>
        <h2 className="display" style={{marginTop: 16, maxWidth: '18ch'}}>
          We are under a new kind of surveillance.
        </h2>

        <div className="ctx-grid" style={{marginTop: 56}}>
          <div>
            <p className="lead">
              Commercial drones — $500 off the shelf — now routinely breach FAA
              flight restrictions over transmission yards, generating stations, and
              control houses. Operators are photographing switchgear, surveilling
              shift changes, and probing radio infrastructure.
            </p>

            <div className="ctx-bullets">
              <div className="ctx-bullet">
                <div className="n">01</div>
                <div>
                  <h4>Recon precedes action</h4>
                  <p>Drone reconnaissance of U.S. electric substations has preceded
                  every publicly disclosed kinetic attack since the 2022 Moore County
                  incident. Imagery shows optics trained on breakers and transformers.</p>
                </div>
              </div>
              <div className="ctx-bullet">
                <div className="n">02</div>
                <div>
                  <h4>A single payload drop takes a bay offline</h4>
                  <p>A 5 kg conductive payload dropped on a 500 kV bus causes
                  flashover. Repair cycle: weeks. Restoration cost: $8–40M. That is
                  a $500 airframe producing a nine-figure loss.</p>
                </div>
              </div>
              <div className="ctx-bullet">
                <div className="n">03</div>
                <div>
                  <h4>Existing fences and cameras don't see up</h4>
                  <p>Perimeter intrusion detection stops at eye level. The airspace
                  above your sites is instrumented by whoever shows up with a
                  controller — unless you instrument it first.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="ctx-stat-card">
              <div className="eyebrow" style={{color: 'var(--dxd-silver)'}}>FERC / NERC CIP Reporting · 2023–2025</div>
              <div className="n" style={{marginTop: 12}}>175+</div>
              <hr/>
              <p style={{margin:0}}>Reported drone incidents over U.S. electric infrastructure in the past 24 months. DHS and FBI classify this as a sustained and escalating threat.</p>
            </div>

            <div className="ctx-incidents">
              <div className="row head">
                <span>Date</span><span>Incident</span><span>Sev</span>
              </div>
              <div className="row">
                <span className="date">2022-12</span>
                <span>Moore County substation attack — 45k out 4d</span>
                <span className="sev">HIGH</span>
              </div>
              <div className="row">
                <span className="date">2023-09</span>
                <span>UAS incursion over PA substation, imagery</span>
                <span className="sev">MED</span>
              </div>
              <div className="row">
                <span className="date">2024-07</span>
                <span>Repeat overflights of TX transmission yard</span>
                <span className="sev">HIGH</span>
              </div>
              <div className="row">
                <span className="date">2025-02</span>
                <span>Group-1 UAS dropped debris on 230kV bay (WV)</span>
                <span className="sev">HIGH</span>
              </div>
              <div className="row">
                <span className="date">2025-11</span>
                <span>Night overflight, thermal optics, VA (disclosed)</span>
                <span className="sev">MED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.HeroScene = HeroScene;
window.ContextScene = ContextScene;

// Scene: Richmond VA overview map — real geography, pan/zoom, site icons.
// 3 Dominion sites, all within the Richmond metro. Pan with drag, zoom with
// buttons / wheel over the map (scroll-scrubbing still works outside the map).

function MapScene({ onZoomToSite }) {
  const [hoveredSite, setHoveredSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState('chesterfield');

  // Pan / zoom state — a simple SVG viewBox transform around a 1000x620 frame.
  const BASE_W = 1000, BASE_H = 620;
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({x:0, y:0, vx:0, vy:0});
  const frameRef = useRef(null);
  // Touch state — pinch + pan
  const pinch = useRef(null); // {dist, cx, cy, startScale, startX, startY}
  const touchPan = useRef(null); // {x, y, vx, vy}

  const clampView = (v) => ({
    scale: Math.max(0.6, Math.min(4, v.scale)),
    x: v.x, y: v.y
  });

  const zoomBy = (delta, cx, cy) => {
    setView(v => {
      const newScale = Math.max(0.6, Math.min(4, v.scale * delta));
      // Zoom around (cx, cy) in frame coordinates
      if (cx == null) { cx = BASE_W/2; cy = BASE_H/2; }
      const k = newScale / v.scale;
      const x = cx - (cx - v.x) * k;
      const y = cy - (cy - v.y) * k;
      return { x, y, scale: newScale };
    });
  };

  const reset = () => setView({x: 0, y: 0, scale: 1});

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragStart.current.x);
    const dy = (e.clientY - dragStart.current.y);
    setView(v => ({ ...v, x: dragStart.current.vx + dx, y: dragStart.current.vy + dy }));
  };
  const onMouseUp = () => setDragging(false);

  // Wheel handler:
  //  - Trackpad pinch → wheel event with ctrlKey=true → zoom
  //  - Mouse wheel → zoom
  //  - Trackpad two-finger swipe (deltaX/deltaY, no ctrl) → pan
  const onWheel = (e) => {
    e.preventDefault();
    const rect = frameRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width * BASE_W;
    const cy = (e.clientY - rect.top) / rect.height * BASE_H;
    const isPinch = e.ctrlKey; // browsers report trackpad pinch as wheel+ctrl
    const isMouseWheel = !e.ctrlKey && Math.abs(e.deltaY) > 50 && e.deltaX === 0;
    if (isPinch) {
      const delta = Math.exp(-e.deltaY * 0.01);
      zoomBy(delta, cx, cy);
    } else if (isMouseWheel) {
      const delta = e.deltaY < 0 ? 1.18 : 1/1.18;
      zoomBy(delta, cx, cy);
    } else {
      // Two-finger trackpad swipe → pan
      setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  // ---- Touch: pinch to zoom, single-finger drag to pan ----
  const screenToFrame = (clientX, clientY) => {
    const rect = frameRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * BASE_W,
      y: (clientY - rect.top) / rect.height * BASE_H,
    };
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Start pinch
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);
      const midClientX = (t1.clientX + t2.clientX) / 2;
      const midClientY = (t1.clientY + t2.clientY) / 2;
      const mid = screenToFrame(midClientX, midClientY);
      pinch.current = {
        dist, cx: mid.x, cy: mid.y,
        startScale: view.scale, startX: view.x, startY: view.y,
        startMidClientX: midClientX, startMidClientY: midClientY,
      };
      touchPan.current = null;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      // Start single-finger pan
      const t = e.touches[0];
      touchPan.current = { x: t.clientX, y: t.clientY, vx: view.x, vy: view.y };
      pinch.current = null;
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinch.current) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);
      const p = pinch.current;
      const ratio = dist / p.dist;
      const newScale = Math.max(0.6, Math.min(4, p.startScale * ratio));
      // Zoom around initial midpoint in frame coords (p.cx, p.cy)
      const k = newScale / p.startScale;
      let x = p.cx - (p.cx - p.startX) * k;
      let y = p.cy - (p.cy - p.startY) * k;
      // Also translate by the midpoint's on-screen drift, so pinch feels
      // "glued to the fingers" as they move as a pair.
      const rect = frameRef.current.getBoundingClientRect();
      const curMidClientX = (t1.clientX + t2.clientX) / 2;
      const curMidClientY = (t1.clientY + t2.clientY) / 2;
      const dxMidFrame = (curMidClientX - p.startMidClientX) / rect.width * BASE_W;
      const dyMidFrame = (curMidClientY - p.startMidClientY) / rect.height * BASE_H;
      x += dxMidFrame;
      y += dyMidFrame;
      setView({ x, y, scale: newScale });
      e.preventDefault();
    } else if (e.touches.length === 1 && touchPan.current) {
      const t = e.touches[0];
      const dx = t.clientX - touchPan.current.x;
      const dy = t.clientY - touchPan.current.y;
      setView(v => ({ ...v, x: touchPan.current.vx + dx, y: touchPan.current.vy + dy }));
      e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinch.current = null;
    if (e.touches.length === 0) touchPan.current = null;
  };

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, view]);

  const site = window.SITES.find(s => s.id === (hoveredSite || selectedSite));

  // Transform string for all map content
  const viewTransform = `translate(${view.x}, ${view.y}) scale(${view.scale})`;

  return (
    <section className="scene" data-screen-label="03 Richmond Sites" style={{padding: '120px 0'}}>
      <div style={{width: '100%', position: 'relative'}}>
        <div className="ctx-wrap" style={{marginBottom: 40}}>
          <div className="eyebrow">Deployment · Richmond, Virginia</div>
          <h2 className="display" style={{marginTop: 16, maxWidth: '22ch'}}>
            Three Richmond sites. One unified airspace picture.
          </h2>
          <p className="lead" style={{marginTop: 24}}>
            DXD proposes a phased deployment across three of Dominion Energy's highest-value
            Richmond-area assets — from the downtown distribution hub feeding the State Capitol
            to the 500 kV generation complex on the James River. A drone crossing any site is
            tracked against a threat profile built from every sensor, every site, every shift.
          </p>
        </div>

        <div
          ref={frameRef}
          className="map-frame-outer"
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          style={{
            position: 'relative', height: '640px', margin: '0 clamp(1rem, 4vw, 3rem)',
            border: '1px solid rgba(255,255,255,0.1)', background: '#070709', overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none',
            touchAction: 'none'
          }}>

          <div className="map-corners"><span/><span/><span/><span/></div>

          {/* THE MAP — SVG over a gridded void */}
          <svg viewBox={`0 0 ${BASE_W} ${BASE_H}`} preserveAspectRatio="xMidYMid slice"
               style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
            <defs>
              <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(200,16,46,0.04)" strokeWidth="1"/>
              </pattern>
              <radialGradient id="map-vignette" cx="50%" cy="50%" r="70%">
                <stop offset="40%" stopColor="rgba(0,0,0,0)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.9)"/>
              </radialGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="2"/></filter>
            </defs>

            {/* Static background — always fills frame */}
            <rect width={BASE_W} height={BASE_H} fill="url(#map-grid)"/>

            {/* Pan/zoom group */}
            <g transform={viewTransform}>
              {/* James River — follows approximate Richmond course: NW→SE through downtown,
                  then sweeps SE out toward Chesterfield.  Rendered wide + soft. */}
              <g opacity="0.55">
                <path d="M 30,120 Q 180,170 280,240 Q 380,290 460,285 Q 540,280 580,320 Q 620,360 700,380 Q 790,400 880,470 Q 940,510 990,580"
                      stroke="rgba(37,99,235,0.18)" strokeWidth="36" fill="none" strokeLinecap="round"/>
                <path d="M 30,120 Q 180,170 280,240 Q 380,290 460,285 Q 540,280 580,320 Q 620,360 700,380 Q 790,400 880,470 Q 940,510 990,580"
                      stroke="rgba(37,99,235,0.45)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <path d="M 30,120 Q 180,170 280,240 Q 380,290 460,285 Q 540,280 580,320 Q 620,360 700,380 Q 790,400 880,470 Q 940,510 990,580"
                      stroke="rgba(120,180,240,0.7)" strokeWidth="1.5" fill="none"/>
              </g>

              {/* Tributaries — Chickahominy (N), Appomattox hint (SE) */}
              <path d="M 150,60 Q 220,120 260,180"
                    stroke="rgba(37,99,235,0.25)" strokeWidth="3" fill="none"/>
              <path d="M 780,590 Q 820,540 870,500"
                    stroke="rgba(37,99,235,0.22)" strokeWidth="3" fill="none"/>

              {/* City of Richmond boundary — rough shape */}
              <path d="M 380,210 L 520,200 L 600,240 L 620,310 L 580,360 L 500,380 L 420,370 L 380,320 Z"
                    stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="rgba(255,255,255,0.02)" strokeDasharray="2 4"/>

              {/* Interstates */}
              {/* I-95 — N/S through downtown */}
              <g>
                <path d="M 500,40 L 502,200 L 510,300 L 515,380 L 520,500 L 530,610"
                      stroke="rgba(217,119,6,0.35)" strokeWidth="3" fill="none"/>
                <path d="M 500,40 L 502,200 L 510,300 L 515,380 L 520,500 L 530,610"
                      stroke="rgba(217,119,6,0.9)" strokeWidth="1" fill="none" strokeDasharray="6 4"/>
              </g>
              {/* I-64 — E/W through midtown */}
              <g>
                <path d="M 60,260 L 200,250 L 360,255 L 500,260 L 640,250 L 820,240 L 980,230"
                      stroke="rgba(217,119,6,0.3)" strokeWidth="3" fill="none"/>
                <path d="M 60,260 L 200,250 L 360,255 L 500,260 L 640,250 L 820,240 L 980,230"
                      stroke="rgba(217,119,6,0.85)" strokeWidth="1" fill="none" strokeDasharray="6 4"/>
              </g>
              {/* I-295 — outer beltway arc */}
              <path d="M 180,120 Q 150,330 260,520 Q 460,630 660,610 Q 840,570 880,380 Q 900,200 760,90"
                    stroke="rgba(217,119,6,0.55)" strokeWidth="1.2" fill="none" strokeDasharray="5 5"/>

              {/* 500 kV transmission spines connecting the three sites */}
              {window.SITES.map((s, i) => {
                const other = window.SITES.slice(i+1);
                return other.map(o => (
                  <line key={`${s.id}-${o.id}`}
                        x1={s.mapX*10} y1={s.mapY*6.2}
                        x2={o.mapX*10} y2={o.mapY*6.2}
                        stroke="rgba(200,16,46,0.22)" strokeWidth="1" strokeDasharray="3 3"/>
                ));
              })}

              {/* Road labels */}
              <g fontFamily="var(--font-mono)" fontSize="9" fill="rgba(217,119,6,0.75)"
                 letterSpacing="0.18em">
                <text x="508" y="60" transform="rotate(-2 508 60)">I-95</text>
                <text x="70" y="253">I-64</text>
                <text x="160" y="115" transform="rotate(-70 160 115)">I-295</text>
              </g>

              {/* Area place labels */}
              <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--dxd-silver)"
                 letterSpacing="0.22em">
                <text x="450" y="260" fill="rgba(255,255,255,0.5)" fontSize="11"
                      letterSpacing="0.3em">RICHMOND</text>
                <text x="715" y="450" fill="rgba(200,16,46,0.55)">CHESTERFIELD CO</text>
                <text x="570" y="160" fill="rgba(200,16,46,0.55)">HENRICO CO</text>
                <text x="200" y="420" fill="rgba(200,16,46,0.45)">POWHATAN CO</text>
                <text x="320" y="300" fill="rgba(37,99,235,0.75)" fontStyle="italic"
                      fontSize="9">James River</text>
                <text x="170" y="100" fill="rgba(37,99,235,0.65)" fontStyle="italic"
                      fontSize="8">Chickahominy R.</text>
              </g>

              {/* Compass & scale bar */}
              <g>
                <circle cx="60" cy="540" r="18" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)"/>
                <path d="M 60,525 L 55,555 L 60,548 L 65,555 Z" fill="var(--dxd-red)"/>
                <text x="60" y="568" fill="var(--dxd-red)" fontSize="8"
                      fontFamily="var(--font-mono)" textAnchor="middle" letterSpacing="0.22em">N</text>
              </g>
              <g transform="translate(110, 585)">
                <line x1="0" y1="0" x2="100" y2="0" stroke="white" strokeWidth="1"/>
                <line x1="0" y1="-4" x2="0" y2="4" stroke="white" strokeWidth="1"/>
                <line x1="50" y1="-3" x2="50" y2="3" stroke="white" strokeWidth="1"/>
                <line x1="100" y1="-4" x2="100" y2="4" stroke="white" strokeWidth="1"/>
                <text x="0" y="16" fill="var(--dxd-silver)" fontSize="9"
                      fontFamily="var(--font-mono)" letterSpacing="0.18em">0</text>
                <text x="100" y="16" fill="var(--dxd-silver)" fontSize="9"
                      fontFamily="var(--font-mono)" letterSpacing="0.18em">5 km</text>
              </g>

              {/* Site markers: detection umbrellas + icon + label */}
              {window.SITES.map(s => {
                const isSel = (hoveredSite || selectedSite) === s.id;
                const cx = s.mapX * 10, cy = s.mapY * 6.2;
                return (
                  <g key={s.id}
                     style={{cursor: 'pointer'}}
                     onMouseEnter={() => setHoveredSite(s.id)}
                     onMouseLeave={() => setHoveredSite(null)}
                     onClick={(e) => { e.stopPropagation(); setSelectedSite(s.id); onZoomToSite && onZoomToSite(s.id); }}>
                    {/* Outer umbrella */}
                    <circle cx={cx} cy={cy} r={isSel ? 80 : 55}
                            fill="rgba(200,16,46,0.06)"
                            stroke="rgba(200,16,46,0.25)" strokeWidth="1"
                            style={{transition: 'all 240ms var(--ease-out)'}}/>
                    <circle cx={cx} cy={cy} r={isSel ? 40 : 28}
                            fill="none" stroke="rgba(200,16,46,0.55)" strokeWidth="1"
                            style={{transition: 'all 240ms var(--ease-out)'}}/>
                    {/* Core — substation glyph (rotated square with cross) */}
                    <g transform={`translate(${cx}, ${cy})`}>
                      <rect x="-9" y="-9" width="18" height="18"
                            fill="#000" stroke="var(--dxd-red)" strokeWidth="1.5"
                            transform="rotate(45)"/>
                      <line x1="-5" y1="0" x2="5" y2="0" stroke="var(--dxd-red)" strokeWidth="1.4"/>
                      <line x1="0" y1="-5" x2="0" y2="5" stroke="var(--dxd-red)" strokeWidth="1.4"/>
                      <circle r="2" fill="var(--dxd-red)"/>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Vignette on top (not zoomed) */}
            <rect width={BASE_W} height={BASE_H} fill="url(#map-vignette)" pointerEvents="none"/>
          </svg>

          {/* Site label overlays — HTML so they stay crisp & clickable */}
          {window.SITES.map(s => {
            const isSel = (hoveredSite || selectedSite) === s.id;
            // Apply view transform to get screen position of label
            const sx = (s.mapX * 10) * view.scale + view.x;
            const sy = (s.mapY * 6.2) * view.scale + view.y;
            const leftPct = (sx / BASE_W) * 100;
            const topPct = (sy / BASE_H) * 100;
            if (leftPct < -10 || leftPct > 110 || topPct < -10 || topPct > 110) return null;
            return (
              <div key={s.id}
                   onClick={(e) => { e.stopPropagation(); setSelectedSite(s.id); }}
                   onMouseEnter={() => setHoveredSite(s.id)}
                   onMouseLeave={() => setHoveredSite(null)}
                   style={{
                     position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                     transform: `translate(16px, -18px)`, zIndex: 5, cursor: 'pointer',
                     pointerEvents: 'auto'
                   }}>
                <div style={{
                  whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
                  fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'var(--fg-1)', fontWeight: 600,
                  background: 'rgba(0,0,0,0.9)', padding: '4px 8px',
                  border: `1px solid ${isSel ? 'var(--dxd-red)' : 'rgba(255,255,255,0.15)'}`,
                  boxShadow: isSel ? '0 0 16px rgba(200,16,46,0.4)' : 'none',
                  transition: 'all 140ms var(--ease-out)'
                }}>
                  {s.name}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dxd-red)',
                    letterSpacing: '0.12em', marginTop: 2
                  }}>
                    {s.priority} · {s.voltage}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Top-left header */}
          <div style={{position: 'absolute', top: 16, left: 20, zIndex: 4,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dxd-silver)',
            letterSpacing: '0.2em', textTransform: 'uppercase'}}>
            Richmond MSA · 37.3°–37.7°N · WGS-84 · DXD-CUAS-RICHMOND-01
          </div>

          {/* Selected site readout */}
          <div className="map-readout">
            <h5>Selected Site · Telemetry</h5>
            <div className="row"><span className="k">Site</span><span className="v">{site.name}</span></div>
            <div className="row"><span className="k">Type</span><span className="v">{site.type}</span></div>
            <div className="row"><span className="k">Voltage</span><span className="v">{site.voltage}</span></div>
            <div className="row"><span className="k">Coord</span><span className="v">{site.coord}</span></div>
            <div className="row"><span className="k">Locality</span><span className="v" style={{fontSize:10}}>{site.locality}</span></div>
            <div className="row"><span className="k">Acreage</span><span className="v">{site.acreage}</span></div>
            <div className="row"><span className="k">Priority</span><span className="v" style={{color: 'var(--dxd-red)'}}>{site.priority}</span></div>
            <div className="row"><span className="k">24mo Incidents<sup>†</sup></span><span className="v">{site.threats}</span></div>
            <div style={{marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,0.1)',
              fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--dxd-silver)',
              lineHeight: 1.5}}>
              <span style={{color: 'var(--dxd-red)'}}>▸</span> {site.notes}
              <div style={{marginTop: 6, fontSize: 9, opacity: 0.6}}>
                <sup>†</sup> Representative; see Sources scene.
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="map-legend">
            <h5>Legend</h5>
            <div className="item">
              <div className="sw" style={{background:'#000', border:'1px solid var(--dxd-red)',
                transform: 'rotate(45deg)', width: 10, height: 10}}/>
              <span>Dominion Substation (DXD deployment)</span>
            </div>
            <div className="item">
              <div className="sw" style={{border:'1px solid rgba(200,16,46,0.5)',
                borderRadius:'50%', background:'transparent'}}/>
              <span>Detection umbrella (~5 km)</span>
            </div>
            <div className="item">
              <div className="sw" style={{background: 'rgba(37,99,235,0.5)'}}/>
              <span>James River / tributaries</span>
            </div>
            <div className="item">
              <div className="sw" style={{background: 'rgba(217,119,6,0.75)', height: 2,
                marginTop: 5}}/>
              <span>Interstate highway</span>
            </div>
            <div className="item">
              <div className="sw" style={{background: 'repeating-linear-gradient(90deg, var(--dxd-red) 0 3px, transparent 3px 6px)',
                height: 2, marginTop: 5}}/>
              <span>DXD C2 fiber backbone</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="map-controls">
            <button onClick={(e) => { e.stopPropagation(); zoomBy(1.3); }} title="Zoom in">+</button>
            <button onClick={(e) => { e.stopPropagation(); zoomBy(1/1.3); }} title="Zoom out">−</button>
            <button onClick={(e) => { e.stopPropagation(); reset(); }} title="Reset view">⟲</button>
            <div className="zoom-ind">{(view.scale * 100).toFixed(0)}%</div>
          </div>

          <div style={{position: 'absolute', bottom: 16, left: 20, zIndex: 4,
            fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.18em',
            color: 'var(--dxd-red)', textTransform: 'uppercase'}}>
            ◐ Drag to pan · Pinch or scroll to zoom · Click a site for telemetry
          </div>
        </div>
      </div>
    </section>
  );
}

window.MapScene = MapScene;

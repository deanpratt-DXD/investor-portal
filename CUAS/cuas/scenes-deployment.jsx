// Scene: 3 Asset Owner sites, each as a full-width isometric 3D substation.
// Replaces the old Regional map + 3D Site Alpha scenes.
// Bottom filter bar: sensor types. Click a row → highlight/pulse that type
// across all 3 sites and dim others. Each row also has a visibility toggle.

function DeploymentScene({ tweaks, setTweaks, refCb }) {
  const [activeType, setActiveType] = useState(null); // null = none highlighted
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const [tipPos, setTipPos] = useState({x: 0, y: 0});

  const sensorOrder = ['rf','df','radar','eoir','acoustic','pids','c2','daas','mit'];

  // Aggregate sensor counts across all 3 sites
  const totalCounts = useMemo(() => {
    const c = {};
    Object.values(window.SITE_LAYOUTS).forEach(layout => {
      layout.sensors.forEach(s => { c[s.sensor] = (c[s.sensor] || 0) + 1; });
    });
    return c;
  }, []);

  const isEnabled = (type) =>
    !tweaks.enabledSensors || tweaks.enabledSensors[type] !== false;

  const toggleType = (type) => {
    setTweaks(t => ({
      ...t,
      enabledSensors: { ...t.enabledSensors, [type]: !isEnabled(type) }
    }));
  };

  const onSensorHover = (placement, siteId, e) => {
    setHoveredSensor({ ...placement, siteId });
    setTipPos({ x: e.clientX + 18, y: e.clientY + 18 });
  };
  const onSensorMove = (e) => {
    if (!hoveredSensor) return;
    const tipW = 480, tipH = 380;
    let x = e.clientX + 18, y = e.clientY + 18;
    if (x + tipW > window.innerWidth)  x = e.clientX - tipW - 18;
    if (y + tipH > window.innerHeight) y = e.clientY - tipH - 18;
    setTipPos({ x, y });
  };
  const onSensorLeave = () => setHoveredSensor(null);

  const hoveredDef = hoveredSensor ? window.SENSORS[hoveredSensor.sensor] : null;

  return (
    <section ref={refCb} className="scene deploy-scene" data-screen-label="03 Deployment — 3 Sites">
      <div className="deploy-intro">
        <div className="eyebrow"><span className="red">DEPLOYMENT</span> · THREE SITES · ONE PICTURE</div>
        <h2 className="hdg">
          Three Regional sites.<br/>
          One unified counter-UAS perimeter.
        </h2>
        <p className="lead">
          Each site gets its own sensor stack, tuned to its footprint and role — from the 1,200-acre
          generation complex at Site Alpha to the 2-acre urban distribution hub downtown.
          Click any sensor row below to see where it lives across the portfolio.
        </p>
      </div>

      {/* Three full-width site panels, stacked */}
      {window.SITES.map((site, idx) => (
        <SitePanel
          key={site.id}
          site={site}
          index={idx}
          layout={window.SITE_LAYOUTS[site.id]}
          tweaks={tweaks}
          activeType={activeType}
          onSensorHover={(p, e) => onSensorHover(p, site.id, e)}
          onSensorMove={onSensorMove}
          onSensorLeave={onSensorLeave}
        />
      ))}

      {/* Sticky bottom filter bar */}
      <div className="sensor-filter-bar">
        <div className="fb-title">
          <span className="num">{Object.values(window.SITE_LAYOUTS).reduce((a, l) => a + l.sensors.length, 0)}</span>
          <span className="lbl">sensors deployed<br/><span className="sub">across 3 sites</span></span>
        </div>
        <div className="fb-rows">
          {sensorOrder.map(type => {
            const s = window.SENSORS[type];
            const active = activeType === type;
            const enabled = isEnabled(type);
            return (
              <div key={type}
                   className={`fb-row ${active ? 'active' : ''} ${enabled ? '' : 'off'}`}
                   onMouseEnter={() => setActiveType(type)}
                   onMouseLeave={() => setActiveType(null)}
                   onClick={() => setActiveType(active ? null : type)}
                   style={{'--c': s.color}}>
                <div className="dot" style={{background: s.color, boxShadow: `0 0 8px ${s.color}`}}/>
                <div className="ico">
                  <SensorIcon type={type} size={18} color={enabled ? s.color : '#555'} strokeWidth={1.7}/>
                </div>
                <div className="text">
                  <div className="short">{s.short}</div>
                  <div className="name">{s.name}</div>
                </div>
                <div className="ct">×{totalCounts[type] || 0}</div>
                <button className={`tog ${enabled ? 'on' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleType(type); }}
                        title={enabled ? 'Hide sensors of this type' : 'Show sensors of this type'}>
                  <span className="knob"/>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredDef && (
        <div className="sensor-tip" style={{left: tipPos.x, top: tipPos.y}}>
          <div className="head">
            <div>
              <div className="ttl">{hoveredDef.name}</div>
              <div className="sub">{hoveredSensor.label} · {hoveredDef.role}</div>
            </div>
            <div className="tag">{hoveredDef.short}</div>
          </div>
          <div className="body">{hoveredDef.desc}</div>
          <div className="specs">
            <h6>Specifications · {hoveredDef.product}</h6>
            {hoveredDef.specs.map(([k, v], i) => (
              <div className="s" key={i}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
          <div className="fn">
            <h6>Functions</h6>
            <ul>
              {hoveredDef.fns.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------
// Full-width panel for one site: sidebar stats + isometric 3D substation.
// ------------------------------------------------------------------------
function SitePanel({ site, index, layout, tweaks, activeType,
                    onSensorHover, onSensorMove, onSensorLeave }) {
  const GRID = 24; // px per grid unit — tuned for readability at full width
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'schematic'

  // Interactive camera: pitch (rotateX), yaw (rotateZ), zoom (scale)
  const [cam, setCam] = useState({ pitch: 60, yaw: index % 2 === 1 ? -12 : 0, zoom: 1 });
  const stageRef = useRef(null);
  const drag = useRef({ active: false, sx: 0, sy: 0, sp: 0, sy0: 0 });

  const onMouseDown = (e) => {
    // Only left-click drag, and not on sensors
    if (e.button !== 0) return;
    if (e.target.closest('.iso-sensor')) return;
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, sp: cam.pitch, sy0: cam.yaw };
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.sx;
      const dy = e.clientY - drag.current.sy;
      setCam(c => ({
        ...c,
        yaw: drag.current.sy0 + dx * 0.4,
        pitch: Math.max(20, Math.min(85, drag.current.sp - dy * 0.3)),
      }));
    };
    const onUp = () => { drag.current.active = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onWheel = (e) => {
    if (!stageRef.current) return;
    // Only zoom when cursor is inside the stage
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setCam(c => ({ ...c, zoom: Math.max(0.5, Math.min(2.5, c.zoom * (1 + delta))) }));
  };
  // Attach non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const handler = (e) => onWheel(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const resetCam = () => setCam({ pitch: 60, yaw: index % 2 === 1 ? -12 : 0, zoom: 1 });

  const isEnabled = (type) =>
    !tweaks.enabledSensors || tweaks.enabledSensors[type] !== false;

  // Is this sensor currently dimmed by the filter bar?
  const dimmed = (p) => activeType && activeType !== p.sensor;

  // Per-type count at this site
  const countsHere = useMemo(() => {
    const c = {};
    layout.sensors.forEach(s => { c[s.sensor] = (c[s.sensor] || 0) + 1; });
    return c;
  }, [layout]);

  return (
    <div className={`site-panel ${index % 2 === 1 ? 'flipped' : ''}`}>
      {/* Band header — site index + name */}
      <div className="site-band">
        <div className="idx">
          <span className="n">{String(index + 1).padStart(2, '0')}</span>
          <span className="of">/03</span>
        </div>
        <div className="name-block">
          <div className="eyebrow">{site.priority} · {site.type}</div>
          <h3>{site.name}</h3>
          <div className="loc">{site.locality} · {site.coord}</div>
        </div>
        <div className="stats">
          <div className="s"><span className="k">Voltage</span><span className="v">{site.voltage}</span></div>
          <div className="s"><span className="k">Acreage</span><span className="v">{site.acreage}</span></div>
          <div className="s"><span className="k">Sensors</span><span className="v">{layout.sensors.length}</span></div>
          <div className="s"><span className="k">24mo Incidents</span><span className="v red">{site.threats}</span></div>
        </div>
      </div>

      {/* View tabs — Real map ⇄ schematic */}
      <div className="iso-stage-shell">
        <div className="view-tabs">
          <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
            ◉ REAL MAP
          </button>
          <button className={viewMode === 'schematic' ? 'active' : ''} onClick={() => setViewMode('schematic')}>
            ▣ SCHEMATIC
          </button>
        </div>

        {viewMode === 'map' ? (
          <div className="iso-stage map-mode">
            <div className="site-mapsingle">
              <div className="pane">
                <div className="pane-label">◉ SITE · REAL WORLD</div>
                <MapboxSite site={site} layout={layout} tweaks={tweaks}
                            activeType={activeType} zoomMode="tight"
                            onSensorHover={(p,e) => onSensorHover(p,e)}
                            onSensorMove={onSensorMove}
                            onSensorLeave={onSensorLeave}/>
              </div>
            </div>

            {/* Per-site mini legend, kept in map view too */}
            <div className="iso-minilegend">
              {['rf','df','radar','eoir','acoustic','pids','c2','daas','mit'].map(t => {
                const ct = countsHere[t];
                if (!ct) return null;
                const s = window.SENSORS[t];
                const active = activeType === t;
                return (
                  <div key={t} className={`mini ${active ? 'active' : ''}`}
                       style={{color: s.color, borderColor: active ? s.color : 'transparent'}}>
                    <SensorIcon type={t} size={12} color={s.color} strokeWidth={1.8}/>
                    <span className="s">{s.short}</span>
                    <span className="c">×{ct}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
      <div className="iso-stage"
           ref={stageRef}
           onMouseDown={onMouseDown}
           style={{cursor: drag.current.active ? 'grabbing' : 'grab'}}>
        {/* Grid backdrop */}
        <div className="iso-grid"/>

        {/* Coordinate markers */}
        <div className="iso-cardinals">
          <span className="n">N ↑</span>
        </div>

        {/* Camera controls */}
        <div className="iso-camctl">
          <button onClick={resetCam} title="Reset view">⟲ RESET</button>
          <div className="iso-camhint">
            DRAG · ROTATE &nbsp;·&nbsp; SCROLL · ZOOM
          </div>
        </div>

        {/* The iso-tilted plane */}
        <div className="iso-plane"
             style={{
               transform: `translate(-50%, -50%) scale(${cam.zoom}) rotateX(${cam.pitch}deg) rotateZ(${cam.yaw}deg)`
             }}>
          {/* Site perimeter fence */}
          <div className="iso-perimeter"
               style={{width: layout.perimeter.w, height: layout.perimeter.h,
                       left: -layout.perimeter.w/2, top: -layout.perimeter.h/2}}>
            <div className="perimeter-label"
                 style={{transform: `rotateZ(${-cam.yaw}deg) rotateX(${-cam.pitch}deg)`}}>
              ▸ Secured Perimeter · 12ft Chainlink + Razor
            </div>
          </div>

          {/* Substation physical elements */}
          {layout.elements.map((el, i) => (
            <IsoElement key={i} el={el} GRID={GRID} cam={cam}/>
          ))}

          {/* Coverage rings */}
          {tweaks.showCoverage && layout.sensors.map(p => {
            if (!isEnabled(p.sensor)) return null;
            if (activeType && activeType !== p.sensor) return null;
            const sensor = window.SENSORS[p.sensor];
            const radius = p.cov * GRID * 0.45;
            if (radius === 0) return null;
            return (
              <div key={`cov-${p.id}`}
                   className="iso-coverage"
                   style={{
                     left: p.pos[0] * GRID, top: p.pos[1] * GRID,
                     width: radius * 2, height: radius * 2,
                     marginLeft: -radius, marginTop: -radius,
                     borderColor: sensor.color,
                     background: `radial-gradient(circle, ${sensor.color}14 0%, transparent 70%)`,
                   }}/>
            );
          })}

          {/* Sensor markers — always face camera (counter-rotate) */}
          {layout.sensors.map(p => {
            if (!isEnabled(p.sensor)) return null;
            const sensor = window.SENSORS[p.sensor];
            const isDimmed = dimmed(p);
            const isHighlighted = activeType === p.sensor;
            return (
              <div key={p.id}
                   className={`iso-sensor ${isHighlighted ? 'highlight' : ''} ${isDimmed ? 'dim' : ''}`}
                   style={{
                     left: p.pos[0] * GRID, top: p.pos[1] * GRID,
                     transform: `translateZ(40px) rotateZ(${-cam.yaw}deg) rotateX(${-cam.pitch}deg)${isHighlighted ? ' scale(1.2)' : ''}`,
                     '--c': sensor.color
                   }}
                   onMouseEnter={(e) => onSensorHover(p, e)}
                   onMouseMove={onSensorMove}
                   onMouseLeave={onSensorLeave}>
                <div className="ring"/>
                <div className="disc">
                  <SensorIcon type={sensor.id} size={16} color={sensor.color} strokeWidth={1.7}/>
                </div>
                {tweaks.showLabels && (
                  <div className="lbl">{p.label}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Per-site mini legend */}
        <div className="iso-minilegend">
          {['rf','df','radar','eoir','acoustic','pids','c2','daas','mit'].map(t => {
            const ct = countsHere[t];
            if (!ct) return null;
            const s = window.SENSORS[t];
            const active = activeType === t;
            return (
              <div key={t} className={`mini ${active ? 'active' : ''}`}
                   style={{color: s.color, borderColor: active ? s.color : 'transparent'}}>
                <SensorIcon type={t} size={12} color={s.color} strokeWidth={1.8}/>
                <span className="s">{s.short}</span>
                <span className="c">×{ct}</span>
              </div>
            );
          })}
        </div>
      </div>
        )}
      </div>
    </div>
  );
}

// Isometric rendered element — full 3D box with top + 4 sides.
// Coordinate system: the iso-plane is tilted via rotateX(60deg). In plane-local
// coordinates, +X = east (right), +Y = south (down-plane), +Z = UP out of plane.
// The box occupies X∈[0,w], Y∈[0,h], Z∈[0,z]. The base sits at Z=0, top at Z=z.
function IsoElement({ el, GRID, cam }) {
  const x = el.pos[0] * GRID;
  const y = el.pos[1] * GRID;
  const w = el.w * GRID;
  const h = el.h * GRID;
  const z = el.type === 'xfmr' ? 70 : el.type === 'ctrl' ? 50 : el.type === 'bus' ? 44 : 36;

  const palette = el.type === 'xfmr'
    ? { top: 'rgba(200,16,46,0.38)', n: 'rgba(200,16,46,0.26)', s: 'rgba(200,16,46,0.18)', e: 'rgba(200,16,46,0.14)', w: 'rgba(200,16,46,0.22)', border: 'rgba(200,16,46,0.85)' }
    : el.type === 'ctrl'
      ? { top: 'rgba(37,99,235,0.28)', n: 'rgba(37,99,235,0.18)', s: 'rgba(37,99,235,0.12)', e: 'rgba(37,99,235,0.09)', w: 'rgba(37,99,235,0.15)', border: 'rgba(37,99,235,0.7)' }
      : el.type === 'bus'
        ? { top: 'rgba(180,180,200,0.22)', n: 'rgba(180,180,200,0.14)', s: 'rgba(180,180,200,0.08)', e: 'rgba(180,180,200,0.06)', w: 'rgba(180,180,200,0.10)', border: 'rgba(180,180,200,0.55)' }
        : { top: 'rgba(255,255,255,0.12)', n: 'rgba(255,255,255,0.08)', s: 'rgba(255,255,255,0.04)', e: 'rgba(255,255,255,0.03)', w: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.32)' };

  const labelColor = el.type === 'xfmr' ? 'var(--dxd-red)' : el.type === 'ctrl' ? '#6AA0FF' : 'var(--dxd-silver)';

  // The wrapper is a 0×0 anchor at the element's center.
  // All faces are absolutely positioned relative to it, measured from the
  // wrapper's origin which sits at the CENTER of the base footprint.
  const hw = w / 2, hh = h / 2;

  return (
    <div className="iso-el" style={{ left: x, top: y }}>
      {/* Top face — sits at Z=z, spanning [-hw,+hw] × [-hh,+hh] */}
      <div className="face top" style={{
        position: 'absolute',
        left: -hw, top: -hh, width: w, height: h,
        background: palette.top,
        border: `1px solid ${palette.border}`,
        transform: `translateZ(${z}px)`,
        boxShadow: `0 0 18px ${palette.border}`,
      }}>
        {el.type === 'xfmr' && <div className="beacon"/>}
      </div>

      {/* North wall — at Y=-hh (top edge of base), rises from Z=0 to Z=z.
          Panel drawn at its base (top of the tilted plane), then rotated
          +90° around X so it stands UP out of the plane. */}
      <div className="face wall" style={{
        position: 'absolute',
        left: -hw, top: -hh - z, width: w, height: z,
        background: palette.n,
        border: `1px solid ${palette.border}`,
        transform: `rotateX(-90deg)`,
        transformOrigin: '50% 100%',
      }}/>
      {/* South wall — at Y=+hh, rises from Z=0 to Z=z. */}
      <div className="face wall" style={{
        position: 'absolute',
        left: -hw, top: hh, width: w, height: z,
        background: palette.s,
        border: `1px solid ${palette.border}`,
        transform: `rotateX(90deg)`,
        transformOrigin: '50% 0%',
      }}/>
      {/* West wall — at X=-hw, rises from Z=0 to Z=z. */}
      <div className="face wall" style={{
        position: 'absolute',
        left: -hw - z, top: -hh, width: z, height: h,
        background: palette.w,
        border: `1px solid ${palette.border}`,
        transform: `rotateY(90deg)`,
        transformOrigin: '100% 50%',
      }}/>
      {/* East wall — at X=+hw. */}
      <div className="face wall" style={{
        position: 'absolute',
        left: hw, top: -hh, width: z, height: h,
        background: palette.e,
        border: `1px solid ${palette.border}`,
        transform: `rotateY(-90deg)`,
        transformOrigin: '0% 50%',
      }}/>

      {/* Label floats above, counter-rotated to face camera */}
      <div className="el-label"
           style={{
             position: 'absolute',
             left: -hw, top: -hh - 14,
             width: w, textAlign: 'center',
             color: labelColor,
             transform: `translateZ(${z + 4}px) rotateX(${cam ? -cam.pitch : -60}deg)`
           }}>
        {el.label}
      </div>
    </div>
  );
}

window.DeploymentScene = DeploymentScene;

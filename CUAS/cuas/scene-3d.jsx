// Scene: 3D rotatable substation with sensor placement + hover specs
// Uses CSS transform-style: preserve-3d for an interactive 3D feel, no three.js needed.

function Substation3DScene({ dayMode = true, showLabels = true, showCoverage = true,
                             enabledSensors, scenarioMode = false, scenarioStep = 0 }) {
  const [rotX, setRotX] = useState(55);
  const [rotY, setRotY] = useState(0);
  const [zoom, setZoom] = useState(0.7);
  const [dragging, setDragging] = useState(false);
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const [tipPos, setTipPos] = useState({x: 0, y: 0});
  const [activeType, setActiveType] = useState(null);

  const stageRef = useRef(null);
  const dragStart = useRef({x:0, y:0, rx:0, ry:0});

  const GRID_PX = 20; // pixels per grid unit in 3D plane
  const CENTER_OFFSET = 450; // ground plane is 900px wide

  // Drag-to-rotate
  const onDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY };
    e.preventDefault();
  };
  const onMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotY(dragStart.current.ry + dx * 0.4);
    setRotX(Math.max(20, Math.min(85, dragStart.current.rx - dy * 0.3)));
  }, [dragging]);
  const onUp = () => setDragging(false);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }
  }, [dragging, onMove]);

  // Auto-rotate slowly when idle
  useEffect(() => {
    if (dragging) return;
    const iv = setInterval(() => {
      setRotY(r => r + 0.08);
    }, 50);
    return () => clearInterval(iv);
  }, [dragging]);

  // Zoom with wheel
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(1.2, z - e.deltaY * 0.001)));
  };

  // Placement -> world transform
  const placeWorld = (pos) => {
    const [gx, gy] = pos;
    return {
      transform: `translate3d(${gx * GRID_PX}px, ${gy * GRID_PX}px, 0)`,
    };
  };

  const sensorCount = useMemo(() => {
    const counts = {};
    window.SENSOR_PLACEMENTS.forEach(p => { counts[p.sensor] = (counts[p.sensor] || 0) + 1; });
    return counts;
  }, []);

  const onSensorHover = (placement, e) => {
    setHoveredSensor(placement);
    setTipPos({ x: e.clientX + 18, y: e.clientY + 18 });
  };
  const onSensorMove = (e) => {
    if (!hoveredSensor) return;
    // Keep tooltip in viewport
    const tipW = 480;
    const tipH = 380;
    let x = e.clientX + 18;
    let y = e.clientY + 18;
    if (x + tipW > window.innerWidth) x = e.clientX - tipW - 18;
    if (y + tipH > window.innerHeight) y = e.clientY - tipH - 18;
    setTipPos({ x, y });
  };
  const onSensorLeave = () => setHoveredSensor(null);

  const isEnabled = (type) => !enabledSensors || enabledSensors[type] !== false;

  const hoveredSensorDef = hoveredSensor ? window.SENSORS[hoveredSensor.sensor] : null;

  return (
    <>
      <div className="substation-stage"
           ref={stageRef}
           onMouseDown={onDown}
           onMouseMove={onSensorMove}
           onWheel={onWheel}
           style={{cursor: dragging ? 'grabbing' : 'grab'}}>

        {/* Atmospheric ground glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 900, height: 600, transform: 'translate(-50%, -50%)',
          background: dayMode
            ? 'radial-gradient(ellipse, rgba(107,107,115,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse, rgba(200,16,46,0.08) 0%, transparent 60%)',
          pointerEvents: 'none'
        }}/>

        {/* The 3D container */}
        <div className="substation-3d"
             style={{
               transform: `translate(-50%, -50%) scale(${zoom}) rotateX(${rotX}deg) rotateZ(${rotY}deg)`,
               transition: dragging ? 'none' : 'transform 60ms linear',
             }}>

          {/* Ground plane */}
          <div style={{
            position: 'absolute', width: 1200, height: 1200,
            left: -600, top: -600,
            background: `
              radial-gradient(ellipse at center, #0F0F12 0%, #000 70%)
            `,
            transformStyle: 'preserve-3d'
          }}>
            {/* Grid lines */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(rgba(200,16,46,0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(200,16,46,0.12) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'
            }}/>
            {/* Cardinal ticks */}
            <div style={{position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
              background: 'rgba(200,16,46,0.3)'}}/>
            <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
              background: 'rgba(200,16,46,0.3)'}}/>
            {/* Cardinal labels */}
            {[['N',600,0],['S',600,1200],['E',1200,600],['W',0,600]].map(([lbl, x, y]) => (
              <div key={lbl} style={{
                position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dxd-red)',
                letterSpacing: '0.2em', fontWeight: 700
              }}>{lbl}</div>
            ))}
          </div>

          {/* Substation perimeter fence */}
          <div style={{
            position: 'absolute', left: -260, top: -220, width: 520, height: 440,
            border: '1.5px solid rgba(200,16,46,0.7)',
            background: 'rgba(200,16,46,0.03)',
          }}>
            <div style={{
              position: 'absolute', top: -20, left: 0,
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dxd-red)',
              letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap'
            }}>▸ Secured Perimeter · 12ft Chainlink + Razor</div>
          </div>

          {/* Substation elements (transformers, switchgear) */}
          {window.SUBSTATION_ELEMENTS.map((el, i) => (
            <SubstationElement key={i} el={el} GRID_PX={GRID_PX} showLabels={showLabels}/>
          ))}

          {/* Coverage rings */}
          {showCoverage && window.SENSOR_PLACEMENTS.map(p => {
            if (!isEnabled(p.sensor)) return null;
            if (activeType && activeType !== p.sensor) return null;
            const sensor = window.SENSORS[p.sensor];
            const radius = p.cov * GRID_PX;
            if (radius === 0) return null;
            return (
              <div key={`cov-${p.id}`}
                   style={{
                     position: 'absolute',
                     left: p.pos[0] * GRID_PX, top: p.pos[1] * GRID_PX,
                     width: radius * 2, height: radius * 2,
                     marginLeft: -radius, marginTop: -radius,
                     borderRadius: '50%',
                     border: `1px dashed ${sensor.color}`,
                     background: `radial-gradient(circle, ${sensor.color}15 0%, transparent 70%)`,
                     opacity: activeType === p.sensor ? 0.7 : 0.25,
                     transition: 'opacity 240ms var(--ease-out)',
                     pointerEvents: 'none'
                   }}/>
            );
          })}

          {/* Sensor markers */}
          {window.SENSOR_PLACEMENTS.map(p => {
            if (!isEnabled(p.sensor)) return null;
            const sensor = window.SENSORS[p.sensor];
            const isHovered = hoveredSensor && hoveredSensor.id === p.id;
            return (
              <div key={p.id}
                   onMouseEnter={(e) => { onSensorHover(p, e); setActiveType(p.sensor); }}
                   onMouseMove={(e) => onSensorMove(e)}
                   onMouseLeave={() => { onSensorLeave(); setActiveType(null); }}
                   style={{
                     position: 'absolute',
                     left: p.pos[0] * GRID_PX, top: p.pos[1] * GRID_PX,
                     width: 36, height: 36, marginLeft: -18, marginTop: -18,
                     cursor: 'pointer', zIndex: isHovered ? 10 : 5,
                     // Counter-rotate so the marker always faces camera
                     transform: `rotateZ(${-rotY}deg) rotateX(${-rotX + 90}deg)`,
                     transformStyle: 'preserve-3d'
                   }}>
                {/* Pulsing ring */}
                <div style={{
                  position: 'absolute', inset: 2, borderRadius: '50%',
                  border: `1px solid ${sensor.color}`,
                  animation: 'sensor-pulse 2.4s infinite ease-out',
                  opacity: isHovered ? 0.9 : 0.6
                }}/>
                {/* Backing disc */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 28, height: 28,
                  background: isHovered ? `${sensor.color}33` : 'rgba(0,0,0,0.85)',
                  border: `1.5px solid ${sensor.color}`,
                  borderRadius: '50%',
                  boxShadow: `0 0 ${isHovered ? 18 : 10}px ${sensor.color}99`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 140ms var(--ease-out)'
                }}>
                  <SensorIcon type={sensor.id} size={18} color={sensor.color} strokeWidth={1.6}/>
                </div>
                {showLabels && (
                  <div style={{
                    position: 'absolute', top: -16, left: 22,
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: sensor.color, whiteSpace: 'nowrap',
                    background: 'rgba(0,0,0,0.9)', padding: '1px 5px',
                    border: `1px solid ${sensor.color}55`,
                    letterSpacing: '0.1em', fontWeight: 600
                  }}>{p.label}</div>
                )}
              </div>
            );
          })}

          {/* Scenario: drone track */}
          {scenarioMode && (
            <DroneTrack step={scenarioStep} GRID_PX={GRID_PX} rotX={rotX} rotY={rotY}/>
          )}
        </div>

        {/* Rotate hint overlay */}
        <div className="rotate-controls">
          <div>◐ Drag to rotate · Scroll to zoom</div>
          <div className="row">
            <span>AZ <span className="hint">{(rotY % 360).toFixed(0)}°</span></span>
            <span>EL <span className="hint">{rotX.toFixed(0)}°</span></span>
            <span>ZM <span className="hint">{(zoom*100).toFixed(0)}%</span></span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredSensorDef && (
        <div className="sensor-tip"
             style={{left: tipPos.x, top: tipPos.y}}>
          <div className="head">
            <div>
              <div className="ttl">{hoveredSensorDef.name}</div>
              <div className="sub">{hoveredSensor.label} · {hoveredSensorDef.role}</div>
            </div>
            <div className="tag">{hoveredSensorDef.short}</div>
          </div>
          <div className="body">{hoveredSensorDef.desc}</div>
          <div className="specs">
            <h6>Specifications · {hoveredSensorDef.product}</h6>
            {hoveredSensorDef.specs.map(([k, v], i) => (
              <div className="s" key={i}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
          <div className="fn">
            <h6>Functions</h6>
            <ul>
              {hoveredSensorDef.fns.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

// One 3D substation structural element — transformer / switchgear / control house.
function SubstationElement({ el, GRID_PX, showLabels }) {
  const x = el.pos[0] * GRID_PX;
  const y = el.pos[1] * GRID_PX;
  const w = el.w * GRID_PX;
  const h = el.h * GRID_PX;
  const z = el.type === 'xfmr' ? 34 : el.type === 'ctrl' ? 26 : 22;

  const baseColor = el.type === 'xfmr'
    ? 'rgba(200,16,46,0.18)'
    : el.type === 'ctrl'
      ? 'rgba(37,99,235,0.1)'
      : 'rgba(255,255,255,0.06)';
  const borderColor = el.type === 'xfmr'
    ? 'rgba(200,16,46,0.8)'
    : el.type === 'ctrl'
      ? 'rgba(37,99,235,0.6)'
      : 'rgba(255,255,255,0.35)';

  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: w, height: h, marginLeft: -w/2, marginTop: -h/2,
      transformStyle: 'preserve-3d',
    }}>
      {/* Base */}
      <div style={{
        position: 'absolute', inset: 0,
        background: baseColor, border: `1px solid ${borderColor}`,
        transform: 'translateZ(0)'
      }}/>
      {/* Top */}
      <div style={{
        position: 'absolute', inset: 0,
        background: baseColor, border: `1px solid ${borderColor}`,
        transform: `translateZ(${z}px)`
      }}>
        {el.type === 'xfmr' && (
          <div style={{
            position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
            width: 3, height: 3, background: 'var(--dxd-red)', boxShadow: '0 0 6px var(--dxd-red)'
          }}/>
        )}
      </div>
      {/* Sides */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: w, height: z,
        background: baseColor, border: `1px solid ${borderColor}`,
        transform: `rotateX(-90deg) translateZ(0)`,
        transformOrigin: 'top'
      }}/>
      <div style={{
        position: 'absolute', left: 0, bottom: 0, width: w, height: z,
        background: baseColor, border: `1px solid ${borderColor}`,
        transform: `rotateX(90deg) translateZ(0)`,
        transformOrigin: 'bottom'
      }}/>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: z, height: h,
        background: baseColor, border: `1px solid ${borderColor}`,
        transform: `rotateY(90deg) translateZ(0)`,
        transformOrigin: 'left'
      }}/>
      <div style={{
        position: 'absolute', right: 0, top: 0, width: z, height: h,
        background: baseColor, border: `1px solid ${borderColor}`,
        transform: `rotateY(-90deg) translateZ(0)`,
        transformOrigin: 'right'
      }}/>

      {showLabels && (
        <div style={{
          position: 'absolute', top: -14, left: 0,
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: el.type === 'xfmr' ? 'var(--dxd-red)' : 'var(--dxd-silver)',
          letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          pointerEvents: 'none'
        }}>{el.label}</div>
      )}
    </div>
  );
}

// Drone track for scenario scene — animated path across the substation
function DroneTrack({ step, GRID_PX, rotX, rotY }) {
  // Path segments — drone enters NW, crosses, exits SE (then intercepted)
  const path = [
    [-18, -15], [-12, -10], [-6, -4], [0, 0], [4, 3], [6, 5], [6, 5]
  ];
  const p = path[Math.min(step, path.length - 1)];
  const trail = path.slice(0, step + 1);

  return (
    <>
      {/* Trail */}
      <svg style={{
        position: 'absolute', left: -600, top: -600, width: 1200, height: 1200,
        pointerEvents: 'none', overflow: 'visible'
      }}>
        <polyline
          points={trail.map(([x,y]) => `${x*GRID_PX + 600},${y*GRID_PX + 600}`).join(' ')}
          fill="none" stroke="var(--dxd-red)" strokeWidth="1.5" strokeDasharray="3 3"
          opacity="0.6"/>
      </svg>

      {/* Drone marker */}
      <div style={{
        position: 'absolute', left: p[0] * GRID_PX, top: p[1] * GRID_PX,
        transform: `translate(-50%, -50%) rotateZ(${-rotY}deg) rotateX(${-rotX + 90}deg)`,
        zIndex: 10, transition: 'all 500ms linear'
      }}>
        <div style={{
          width: 18, height: 18, background: 'var(--dxd-red)',
          boxShadow: '0 0 20px var(--dxd-red)',
          transform: 'rotate(45deg)', border: '2px solid #fff'
        }}/>
        <div style={{
          position: 'absolute', top: -18, left: 16, whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dxd-red)',
          background: 'rgba(0,0,0,0.85)', padding: '2px 6px',
          border: '1px solid var(--dxd-red)', letterSpacing: '0.1em', fontWeight: 700
        }}>UAS-01 · DJI M300</div>
      </div>
    </>
  );
}

window.Substation3DScene = Substation3DScene;

// Live Scenario — rogue drone incident at Chesterfield, told in 8 scroll
// beats. A sticky full-viewport stage holds a Mapbox close-up on the left
// and the DXD Aegis C2 ops console on the right. Scroll scrubs the story.

function ScenarioScene({ tweaks, refCb }) {
  const stickyRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const sensorMarkersRef = useRef({});
  const droneMarkerRef = useRef(null);
  const pilotMarkerRef = useRef(null);
  const sheriffMarkerRef = useRef(null);
  const interceptMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Which step we're on (0..N-1), driven by scroll position within the sticky.
  const STEPS = window.SCENARIO_STEPS;
  const N = STEPS.length;
  const [step, setStep] = useState(0);
  // Intra-step progress, used to animate drone along the path between beats.
  const [stepProg, setStepProg] = useState(0);

  // Chesterfield site for map anchoring.
  const site = useMemo(
    () => window.SITES.find(s => s.id === 'chesterfield'),
    []
  );
  const layout = window.SITE_LAYOUTS.chesterfield;

  // ---------------- Scroll → step mapping ----------------
  // The sticky container is (N+1) * 100vh tall. The inner stage stays pinned
  // for the full range; scroll position inside it picks the active step.
  useEffect(() => {
    const onScroll = () => {
      const wrap = stickyRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = wrap.offsetHeight - vh;
      const scrolled = Math.max(0, Math.min(total, -rect.top));
      const t = total > 0 ? scrolled / total : 0;           // 0..1 through scene
      const raw = t * (N - 1);                              // 0..N-1
      const idx = Math.max(0, Math.min(N - 1, Math.floor(raw)));
      const frac = Math.max(0, Math.min(1, raw - idx));
      setStep(idx);
      setStepProg(frac);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [N]);

  const current = STEPS[step];
  const next = STEPS[Math.min(N - 1, step + 1)];

  // Accumulated log — show all lines from all steps up to & including current.
  const accumulatedLog = useMemo(() => {
    const all = [];
    for (let i = 0; i <= step; i++) {
      STEPS[i].logLines.forEach(l => all.push({ ...l, _step: i }));
    }
    return all;
  }, [step]);

  const firedChannels = useMemo(() => {
    const s = new Set();
    for (let i = 0; i <= step; i++) {
      (STEPS[i].channelsFired || []).forEach(c => s.add(c));
    }
    return s;
  }, [step]);

  // Smoothly interpolated drone position between current and next step.
  const droneT = useMemo(() => {
    const a = current.droneT;
    const b = next.droneT;
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;
    return a + (b - a) * stepProg;
  }, [current, next, stepProg]);

  // Interpolate along the drone path polyline to get lng/lat.
  const dronePos = useMemo(() => {
    if (droneT == null) return null;
    const path = window.SCENARIO_DRONE_PATH;
    const u = droneT * (path.length - 1);
    const i = Math.floor(u);
    const f = u - i;
    const a = path[Math.min(path.length - 1, i)];
    const b = path[Math.min(path.length - 1, i + 1)];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }, [droneT]);

  // Interceptor drone lat/lng along its own path.
  const interceptT = useMemo(() => {
    const a = current.interceptT;
    const b = next.interceptT;
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;
    return a + (b - a) * stepProg;
  }, [current, next, stepProg]);

  const interceptPos = useMemo(() => {
    if (interceptT == null) return null;
    const path = window.SCENARIO_INTERCEPT_PATH;
    const u = interceptT * (path.length - 1);
    const i = Math.floor(u);
    const f = u - i;
    const a = path[Math.min(path.length - 1, i)];
    const b = path[Math.min(path.length - 1, i + 1)];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }, [interceptT]);

  // ---------------- Map setup (one-time) ----------------
  useEffect(() => {
    if (!window.mapboxgl || !mapContainerRef.current) return;
    setMapReady(false);

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [site.lng, site.lat],
      zoom: 15.9,
      pitch: 55,
      bearing: -15,
      antialias: true,
      attributionControl: false,
      cooperativeGestures: true,
      interactive: false,   // scene drives the camera; no user manipulation
    });
    mapRef.current = map;

    map.on('load', () => {
      // Terrain
      try {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512, maxzoom: 14,
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });
      } catch (e) {}

      // 3D buildings
      try {
        map.addLayer({
          id: '3d-buildings', source: 'composite', 'source-layer': 'building',
          filter: ['==', ['get', 'extrude'], 'true'],
          type: 'fill-extrusion', minzoom: 13,
          paint: {
            'fill-extrusion-color': '#1c1c26',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.85,
          },
        });
      } catch (e) {}

      // Perimeter polygon (Chesterfield fence line)
      try {
        const wu = layout.perimeter.w / 24;
        const hu = layout.perimeter.h / 24;
        const latRad = site.lat * Math.PI / 180;
        const toLngLat = (x, y) => {
          const mx = x * site.metersPerUnit;
          const my = y * site.metersPerUnit;
          return [
            site.lng + mx / (111320 * Math.cos(latRad)),
            site.lat - my / 111320,
          ];
        };
        const pts = [
          toLngLat(-wu/2, -hu/2),
          toLngLat( wu/2, -hu/2),
          toLngLat( wu/2,  hu/2),
          toLngLat(-wu/2,  hu/2),
          toLngLat(-wu/2, -hu/2),
        ];
        map.addSource('perim', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } },
        });
        map.addLayer({
          id: 'perim-fill', type: 'fill', source: 'perim',
          paint: { 'fill-color': '#C8102E', 'fill-opacity': 0.07 },
        });
        map.addLayer({
          id: 'perim-line', type: 'line', source: 'perim',
          paint: { 'line-color': '#C8102E', 'line-width': 2, 'line-dasharray': [2, 2] },
        });
      } catch (e) {}

      // Drone flight path (full polyline, drawn but faint)
      try {
        map.addSource('drone-path', {
          type: 'geojson',
          data: { type: 'Feature', geometry: {
            type: 'LineString', coordinates: window.SCENARIO_DRONE_PATH,
          }},
        });
        map.addLayer({
          id: 'drone-path-line', type: 'line', source: 'drone-path',
          paint: {
            'line-color': '#C8102E',
            'line-width': 1.5,
            'line-opacity': 0.35,
            'line-dasharray': [1, 2],
          },
        });
      } catch (e) {}

      // Interceptor drone flight path (dashed gold)
      try {
        map.addSource('intercept-path', {
          type: 'geojson',
          data: { type: 'Feature', geometry: {
            type: 'LineString', coordinates: window.SCENARIO_INTERCEPT_PATH,
          }},
        });
        map.addLayer({
          id: 'intercept-path-line', type: 'line', source: 'intercept-path',
          paint: {
            'line-color': '#F5B841',
            'line-width': 2,
            'line-opacity': 0,
            'line-dasharray': [2, 1.5],
          },
        });
      } catch (e) {}

      // Sheriff response route
      try {
        map.addSource('sheriff-route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: {
            type: 'LineString',
            coordinates: [
              window.SCENARIO_SHERIFF_START,
              // Rough waypoint crossing the river
              [-77.3920, 37.3830],
              [-77.3820, 37.3850],
              window.SCENARIO_PILOT,
            ],
          }},
        });
        map.addLayer({
          id: 'sheriff-route-line', type: 'line', source: 'sheriff-route',
          paint: {
            'line-color': '#4AA3FF', 'line-width': 2.5, 'line-opacity': 0,
            'line-dasharray': [2, 1],
          },
        });
      } catch (e) {}

      // ---------------- Sensor markers (HTML) ----------------
      const latRad2 = site.lat * Math.PI / 180;
      const toLngLat2 = (x, y) => {
        const mx = x * site.metersPerUnit;
        const my = y * site.metersPerUnit;
        return [
          site.lng + mx / (111320 * Math.cos(latRad2)),
          site.lat - my / 111320,
        ];
      };
      layout.sensors.forEach(p => {
        const sensor = window.SENSORS[p.sensor];
        const el = document.createElement('div');
        el.className = 'scn-sensor';
        el.dataset.sensorId = p.id;
        el.style.setProperty('--c', sensor.color);
        el.innerHTML = `
          <div class="pulse"></div>
          <div class="disc"></div>
        `;
        const marker = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(toLngLat2(p.pos[0], p.pos[1]))
          .addTo(map);
        sensorMarkersRef.current[p.id] = el;
      });

      // Drone marker (hidden until step 1)
      {
        const el = document.createElement('div');
        el.className = 'scn-drone';
        el.innerHTML = `
          <div class="halo"></div>
          <div class="cross">
            <div class="h"></div><div class="v"></div>
          </div>
          <div class="lbl">UAS-01</div>
        `;
        const m = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([site.lng, site.lat])
          .addTo(map);
        droneMarkerRef.current = { el, m };
        el.style.opacity = '0';
      }

      // Pilot marker (hidden until operator DF)
      {
        const el = document.createElement('div');
        el.className = 'scn-pilot';
        el.innerHTML = `
          <div class="cep"></div>
          <div class="pin"></div>
          <div class="lbl">PILOT · ±22 m</div>
        `;
        const m = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(window.SCENARIO_PILOT)
          .addTo(map);
        pilotMarkerRef.current = { el, m };
        el.style.opacity = '0';
      }

      // Sheriff unit marker
      {
        const el = document.createElement('div');
        el.className = 'scn-sheriff';
        el.innerHTML = `
          <div class="dot"></div>
          <div class="lbl">CCSO</div>
        `;
        const m = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(window.SCENARIO_SHERIFF_START)
          .addTo(map);
        sheriffMarkerRef.current = { el, m };
        el.style.opacity = '0';
      }

      // Interceptor drone marker (DXD-AIR-01) · starts hidden
      {
        const el = document.createElement('div');
        el.className = 'scn-intercept';
        el.innerHTML = `
          <div class="halo"></div>
          <div class="cross">
            <div class="h"></div><div class="v"></div>
          </div>
          <div class="lbl">DXD-AIR-01</div>
        `;
        const m = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(window.SCENARIO_INTERCEPT_LAUNCH)
          .addTo(map);
        interceptMarkerRef.current = { el, m };
        el.style.opacity = '0';
      }

      setMapReady(true);
    });

    // Keep the Mapbox canvas sized to its container — critical when the
    // map mounts before the sticky layout settles. Without this the canvas
    // can render at 0 height and the map appears "missing".
    const ro = new ResizeObserver(() => {
      try { map.resize(); } catch (e) {}
    });
    ro.observe(mapContainerRef.current);

    return () => {
      try {
        ro.disconnect();
        Object.values(sensorMarkersRef.current).forEach(el => {
          el.parentElement?.removeChild?.(el);
        });
        sensorMarkersRef.current = {};
        if (droneMarkerRef.current) droneMarkerRef.current.m.remove();
        if (pilotMarkerRef.current) pilotMarkerRef.current.m.remove();
        if (sheriffMarkerRef.current) sheriffMarkerRef.current.m.remove();
        if (interceptMarkerRef.current) interceptMarkerRef.current.m.remove();
        map.remove();
      } catch (e) {}
    };
  }, [site.id]);

  // ---------------- Animate layers on step change ----------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Update sensor marker states
    const active = new Set(current.sensorsActive || []);
    const alert = new Set(current.sensorsAlert || []);
    Object.entries(sensorMarkersRef.current).forEach(([id, el]) => {
      el.classList.remove('active', 'alert');
      if (alert.has(id)) el.classList.add('alert');
      else if (active.has(id)) el.classList.add('active');
    });

    // Pilot visibility
    if (pilotMarkerRef.current) {
      pilotMarkerRef.current.el.style.opacity = current.pilotShown ? '1' : '0';
    }

    // Sheriff visibility
    if (sheriffMarkerRef.current) {
      const show = current.showResponse?.sheriff;
      sheriffMarkerRef.current.el.style.opacity = show ? '1' : '0';
    }
    try {
      map.setPaintProperty('sheriff-route-line', 'line-opacity',
        current.showResponse?.sheriff ? 0.55 : 0);
    } catch (e) {}

    // Interceptor visibility + path line fade-in
    try {
      map.setPaintProperty('intercept-path-line', 'line-opacity',
        current.interceptShown ? 0.6 : 0);
    } catch (e) {}

    // Camera:
    //   Steps 0-4: tight on the site (zoom 15.9, high pitch) so the drone
    //              visibly flies IN to the sensor network.
    //   Step 3:    nudge bearing slightly so the operator-DF vectors are
    //              readable once pilot marker drops.
    //   Step 5+:   pull back to reveal the James River + pilot across water
    //              + sheriff response routing.
    const cam = (() => {
      if (current.step === 0) return { zoom: 15.9, pitch: 55, bearing: -15 };
      if (current.step === 1) return { zoom: 15.9, pitch: 55, bearing: -15 };
      if (current.step === 2) return { zoom: 15.9, pitch: 58, bearing: -10 };
      if (current.step === 3) return { zoom: 15.6, pitch: 58, bearing:  -5 };
      if (current.step === 4) return { zoom: 15.3, pitch: 58, bearing:   0 };
      if (current.step === 5) return { zoom: 14.2, pitch: 55, bearing:  10 };
    if (current.step === 9) return      { zoom: 15.6, pitch: 55, bearing:   0 };
    if (current.step === 8) return      { zoom: 15.2, pitch: 55, bearing:   5 };
    if (current.step === 7) return      { zoom: 15.0, pitch: 58, bearing:  10 };
    if (current.step === 6) return      { zoom: 15.2, pitch: 58, bearing:  10 };
    })();
    try {
      map.easeTo({ ...cam, duration: 900 });
    } catch (e) {}
  }, [current, mapReady]);

  // ---------------- Animate drone position on every scroll tick ----------------
  useEffect(() => {
    if (!droneMarkerRef.current || !mapReady) return;
    if (dronePos) {
      droneMarkerRef.current.m.setLngLat(dronePos);
      droneMarkerRef.current.el.style.opacity = '1';
    } else {
      droneMarkerRef.current.el.style.opacity = '0';
    }
  }, [dronePos, mapReady]);

  // ---------------- Animate interceptor drone ----------------
  useEffect(() => {
    if (!interceptMarkerRef.current || !mapReady) return;
    if (current.interceptShown && interceptPos) {
      interceptMarkerRef.current.m.setLngLat(interceptPos);
      interceptMarkerRef.current.el.style.opacity = '1';
      interceptMarkerRef.current.el.classList.toggle('active',
        !!current.interceptActive);
    } else {
      interceptMarkerRef.current.el.style.opacity = '0';
    }
  }, [interceptPos, current, mapReady]);

  // ---------------- Render ----------------
  // Sticky container: (N+1) * 100vh. The last 100vh is a release so the
  // pinned stage exits cleanly before the next scene.
  const totalVH = (N + 1) * 100;

  return (
    <section ref={refCb} className="scene-sticky scenario-sticky"
             data-screen-label="04 Live Scenario"
             style={{ height: `${totalVH}vh` }}>
      <div ref={stickyRef} style={{ height: '100%' }}>
        <div className="sticky-inner scn-stage">

          {/* Scene label */}
          <div className="scene-label">
            <span className="red">SCENE 04</span> · Live Scenario · Chesterfield · INC-2026-CHE-0173
          </div>

          {/* Left: map */}
          <div className="scn-map-pane">
            <div ref={mapContainerRef} className="scn-map"/>

            {/* Header strip (alert banner) */}
            <div className={`scn-banner alert-${current.alertLevel}`}>
              <div className="left">
                <span className="pill">{current.label}</span>
                <span className="time">{current.t}</span>
              </div>
              <div className="mid">{current.title}</div>
              <div className="right">
                <span className="dot"/>
                <span className="state">
                  {current.alertLevel === 'nominal'  && 'NOMINAL'}
                  {current.alertLevel === 'yellow'   && 'ALERT · YELLOW'}
                  {current.alertLevel === 'amber'    && 'ALERT · AMBER'}
                  {current.alertLevel === 'red'      && 'ALERT · RED'}
                  {current.alertLevel === 'handoff'  && 'AUTHORITY · FEDERAL'}
                  {current.alertLevel === 'resolved' && 'TRACKING · INCIDENT OPEN'}
                </span>
              </div>
            </div>

            {/* Step pip-bar along bottom */}
            <div className="scn-steps">
              {STEPS.map((s, i) => (
                <div key={i}
                     className={`pip ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}
                     title={s.label}>
                  <span className="n">{String(i+1).padStart(2,'0')}</span>
                  <span className="l">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Caption (narrative) */}
            <div className="scn-caption">
              <div className="hd">
                <span className="step-n">STEP {String(step+1).padStart(2,'0')}/{String(N).padStart(2,'0')}</span>
                <span className="step-t">{current.t}</span>
              </div>
              <p>{current.caption}</p>
              <div className="hint">SCROLL TO ADVANCE ↓</div>
            </div>
          </div>

          {/* Right: C2 console */}
          <aside className="scn-c2">
            <div className="c2-head">
              <div className="h-l">
                <div className="app">DXD AEGIS · C2</div>
                <div className="sub">Single pane · all sites · all sensors</div>
              </div>
              <div className="h-r">
                <span className="clk">{current.t}</span>
              </div>
            </div>

            {/* Active track card */}
            <div className="c2-track">
              <div className="t-hd">
                <span className="k">ACTIVE TRACK</span>
                <span className={`v ${current.alertLevel === 'red' || current.alertLevel === 'handoff' ? 'red' : ''}`}>
                  {step === 0 ? '— NO TRACKS —' : 'UAS-01'}
                </span>
              </div>
              {step > 0 && (
                <div className="t-rows">
                  <div><span>Class</span>
                    <b className={step >= 4 ? 'red' : ''}>
                      {step >= 4 ? 'GROUP 1 · RECON' : step >= 2 ? 'GROUP 1 · sUAS' : 'UNKNOWN'}
                    </b>
                  </div>
                  <div><span>Platform</span>
                    <b>{step >= 2 ? 'DJI M300 RTK' : '—'}</b>
                  </div>
                  <div><span>Alt / Speed</span>
                    <b>{step >= 2 ? '120 m AGL · 11 m/s SE' : '—'}</b>
                  </div>
                  <div><span>Remote ID</span>
                    <b className="red">{step >= 1 ? 'NONE · UNAUTHORIZED' : '—'}</b>
                  </div>
                  <div><span>Operator</span>
                    <b className={current.pilotShown ? 'red' : ''}>
                      {current.pilotShown ? '1.8 km NNW · Dutch Gap' : step >= 1 ? 'ISOLATING…' : '—'}
                    </b>
                  </div>
                  <div><span>Priors</span>
                    <b>{step >= 4 ? '2 matches · 2025-Q4' : step >= 2 ? 'CHECKING…' : '—'}</b>
                  </div>
                </div>
              )}
            </div>

            {/* Intercept / Comms panel — appears when DXD launches AIR-01 */}
            {(current.interceptShown || current.commsShown) && (
              <div className="c2-intercept">
                <div className="i-hd">
                  <span className="k">DXD INTERCEPT · AIR-01</span>
                  <span className={`v ${current.interceptActive ? 'active' : 'idle'}`}>
                    {current.interceptActive ? '● AIRBORNE' : '○ RTB / STOWED'}
                  </span>
                </div>
                <div className="i-rows">
                  <div><span>Operator</span>  <b>Sgt. M. Marquez · DXD watch</b></div>
                  <div><span>Airframe</span>  <b>Skydio X10D · tail N4412X</b></div>
                  <div><span>Posture</span>   <b>{current.step <= 6 ? 'LAUNCH + CLIMB' : current.step === 7 ? 'TRAIL · 40 m' : current.step === 8 ? 'OVERWATCH · DESCENT ESCORT' : 'RTB'}</b></div>
                  <div><span>FAA</span>       <b className="ok">TFR active · LOA CHE-04</b></div>
                </div>

                {current.commsShown && current.comms && (
                  <div className="i-comms">
                    <div className="c-hd">PILOT COMMS · RID BRIDGE + 121.5 MHz · RECORDING</div>
                    {current.comms.map((m, i) => (
                      <div key={i} className={`c-msg side-${m.side}`}>
                        <div className="c-meta">
                          <span className="t">{m.t}</span>
                          <span className="who">{m.from}</span>
                          <span className="role">{m.role}</span>
                        </div>
                        <div className="c-body">{m.msg}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sensor tiles */}
            <div className="c2-sensors">
              <div className="s-hd">ON-SITE SENSOR GRID · CHESTERFIELD</div>
              <div className="s-tiles">
                {['rf','df','radar','eoir','acoustic','pids','c2','daas'].map(type => {
                  const def = window.SENSORS[type];
                  // Are any of this type alert/active this step?
                  const typeSensors = layout.sensors.filter(s => s.sensor === type);
                  const anyActive = typeSensors.some(s => current.sensorsActive?.includes(s.id));
                  const anyAlert = typeSensors.some(s => current.sensorsAlert?.includes(s.id));
                  return (
                    <div key={type}
                         className={`s-tile ${anyAlert ? 'alert' : anyActive ? 'active' : ''}`}
                         style={{ '--c': def.color }}>
                      <div className="s-short">{def.short}</div>
                      <div className="s-name">{def.name.split(' ').slice(0,2).join(' ')}</div>
                      <div className="s-state">
                        {anyAlert ? '● FIRING' : anyActive ? '● ACTIVE' : '○ STANDBY'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Federation feed */}
            <div className="c2-federation">
              <div className="f-hd">
                <span>FEDERATION · AUTO-NOTIFY</span>
                <span className="count">
                  {firedChannels.size}/{window.FEDERATION_CHANNELS.length} notified
                </span>
              </div>
              <div className="f-list">
                {window.FEDERATION_CHANNELS.map(c => {
                  const fired = firedChannels.has(c.id);
                  return (
                    <div key={c.id} className={`f-row ${fired ? 'fired' : ''}`}>
                      <div className="tier">{c.tier}</div>
                      <div className="body">
                        <div className="ag">{c.agency}</div>
                        <div className="un">{c.unit}</div>
                        <div className="ch">{c.channel}</div>
                      </div>
                      <div className="mark">
                        {fired ? '✓ ACK' : '○ ——'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Event log */}
            <div className="c2-log">
              <div className="l-hd">
                <span>INCIDENT LOG</span>
                <span className="inc">INC-2026-CHE-0173</span>
              </div>
              <div className="l-entries">
                {accumulatedLog.map((e, i) => (
                  <div key={i} className={`l-entry t-${e.type}`}>
                    <span className="t">{e.t}</span>
                    <span className="sys">{e.sys}</span>
                    <span className="msg">{e.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="c2-foot">
              <span>DXD AEGIS · FedRAMP Mod</span>
              <span>NIST 800-171 · CoC sealed</span>
            </div>
          </aside>

        </div>
      </div>
    </section>
  );
}

window.ScenarioScene = ScenarioScene;

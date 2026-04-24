// Mapbox-powered 3D site view. Drop-in alternative to the isometric schematic.
// Real satellite imagery + terrain + building extrusions, with sensor markers
// pinned at real lat/lon derived from the schematic's grid coordinates.

function MapboxSite({ site, layout, tweaks, activeType,
                      onSensorHover, onSensorMove, onSensorLeave,
                      zoomMode = 'tight' /* 'tight' | 'wide' */ }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [mapStyle, setMapStyle] = useState('satellite'); // 'satellite' | 'dark' | 'streets'
  const [pitch, setPitch] = useState(58);
  const [bearing, setBearing] = useState(site.mapBearing || 0);

  const styleUrl = {
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark:      'mapbox://styles/mapbox/dark-v11',
    streets:   'mapbox://styles/mapbox/streets-v12',
  }[mapStyle];

  const isEnabled = (type) =>
    !tweaks.enabledSensors || tweaks.enabledSensors[type] !== false;

  // Grid-unit → lat/lon (around the site center).
  // Grid +x = east, grid +y = south (matches how the schematic is drawn,
  // where y increases downward).
  const gridToLngLat = (pos) => {
    const mx = pos[0] * site.metersPerUnit;
    const my = pos[1] * site.metersPerUnit;
    const latRad = site.lat * Math.PI / 180;
    const dLat = -my / 111320;                          // y grows south → lat drops
    const dLng = mx / (111320 * Math.cos(latRad));
    return [site.lng + dLng, site.lat + dLat];
  };

  // One-time map construction.
  useEffect(() => {
    setReady(false);
    if (!window.mapboxgl) {
      console.warn('Mapbox GL not loaded');
      return;
    }
    if (!containerRef.current) return;

    const zoom = zoomMode === 'wide' ? site.mapZoomWide : site.mapZoomTight;
    // Allow the user to zoom out a couple of levels for context, then
    // hand the wheel back to the page so the next scroll moves the
    // outer document instead of zooming the world out to space.
    const minZoom = Math.max(0, zoom - 2);

    const map = new window.mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [site.lng, site.lat],
      zoom,
      minZoom,
      pitch: pitch,
      bearing: bearing,
      antialias: true,
      attributionControl: false,
      cooperativeGestures: false,
      dragRotate: true,
      pitchWithRotate: true,
      touchZoomRotate: true,
      maxPitch: 85,
    });
    mapRef.current = map;

    // Wheel passthrough: when the map is already at its minZoom floor
    // and the user keeps scrolling "out" (deltaY > 0), intercept the
    // wheel event in the capture phase before Mapbox sees it so the
    // browser performs its native page scroll instead.
    const onWheelCapture = (e) => {
      if (!mapRef.current) return;
      const z = mapRef.current.getZoom();
      const min = mapRef.current.getMinZoom();
      if (e.deltaY > 0 && z <= min + 0.01) {
        e.stopImmediatePropagation();
        // do NOT preventDefault — let the browser scroll the page
      }
    };
    containerRef.current.addEventListener('wheel', onWheelCapture, { capture: true, passive: true });

    // Sync state when user drags/rotates/pitches
    map.on('rotate', () => setBearing(map.getBearing()));
    map.on('pitch', () => setPitch(map.getPitch()));

    map.on('load', () => {
      // Terrain
      try {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.3 });
      } catch (e) { console.warn('terrain failed', e); }

      // 3D building extrusions
      try {
        const layers = map.getStyle().layers || [];
        const labelLayerId = (layers.find(l =>
          l.type === 'symbol' && l.layout && l.layout['text-field']
        ) || {}).id;

        if (!map.getLayer('3d-buildings')) {
          map.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', ['get', 'extrude'], 'true'],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'], ['get', 'height'],
                0, '#181820',
                20, '#2a2a34',
                60, '#3a3a48',
                120, '#54545e'
              ],
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                15, ['get', 'height']
              ],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.85,
            },
          }, labelLayerId);
        }
      } catch (e) { console.warn('buildings failed', e); }

      // Perimeter fence polygon from layout.perimeter (in schematic pixels, 24px/grid unit).
      try {
        const wu = layout.perimeter.w / 24;
        const hu = layout.perimeter.h / 24;
        const pts = [
          gridToLngLat([-wu/2, -hu/2]),
          gridToLngLat([ wu/2, -hu/2]),
          gridToLngLat([ wu/2,  hu/2]),
          gridToLngLat([-wu/2,  hu/2]),
          gridToLngLat([-wu/2, -hu/2]),
        ];

        if (map.getLayer('perim-fill')) map.removeLayer('perim-fill');
        if (map.getLayer('perim-line')) map.removeLayer('perim-line');
        if (map.getSource('perimeter')) map.removeSource('perimeter');

        map.addSource('perimeter', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [pts] },
          },
        });
        map.addLayer({
          id: 'perim-fill', type: 'fill', source: 'perimeter',
          paint: { 'fill-color': '#C8102E', 'fill-opacity': 0.08 },
        });
        map.addLayer({
          id: 'perim-line', type: 'line', source: 'perimeter',
          paint: {
            'line-color': '#C8102E',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });
      } catch (e) { console.warn('perimeter failed', e); }

      setReady(true);
    });

    return () => {
      try {
        if (containerRef.current) {
          containerRef.current.removeEventListener('wheel', onWheelCapture, { capture: true });
        }
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        map.remove();
      } catch (e) {}
    };
  }, [site.id, zoomMode, styleUrl]);

  // Build sensor HTML markers (and rebuild when filters change).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Coverage layer (single GeoJSON with all visible coverage circles).
    const covFeatures = [];
    layout.sensors.forEach(p => {
      if (!isEnabled(p.sensor)) return;
      if (activeType && activeType !== p.sensor) return;
      if (!tweaks.showCoverage) return;
      const sensor = window.SENSORS[p.sensor];
      const radiusMeters = (p.cov || 0) * site.metersPerUnit * 2.2; // cov in grid units → meters
      if (radiusMeters <= 0) return;
      covFeatures.push({
        type: 'Feature',
        properties: { color: sensor.color, type: p.sensor },
        geometry: {
          type: 'Point',
          coordinates: gridToLngLat(p.pos),
        },
        radius: radiusMeters,
      });
    });

    // Update coverage source
    try {
      const covData = {
        type: 'FeatureCollection',
        features: covFeatures.map(f => ({
          type: 'Feature',
          properties: f.properties,
          geometry: f.geometry,
        })),
      };
      if (map.getSource('cov-src')) {
        map.getSource('cov-src').setData(covData);
      } else {
        map.addSource('cov-src', { type: 'geojson', data: covData });
        // Circle in meters: use a line layer with `line-width` driven by zoom,
        // or better, draw filled circles as polygons. We'll use Mapbox's
        // 'circle' type but in pixels — so we emulate meters via pre-built
        // turf-style polygons. Keep it simple: circle with pixel radius
        // derived from properties.
        map.addLayer({
          id: 'cov-fill',
          type: 'circle',
          source: 'cov-src',
          paint: {
            // pixel radius scaled by zoom approximation — not exact meters,
            // but visually tuned
            'circle-radius': [
              'interpolate', ['exponential', 2], ['zoom'],
              12, 6,
              16, 40,
              18, 80,
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.08,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.5,
          },
        });
      }
    } catch (e) { console.warn('coverage failed', e); }

    // Sensor markers (HTML)
    layout.sensors.forEach(p => {
      if (!isEnabled(p.sensor)) return;
      const sensor = window.SENSORS[p.sensor];
      const el = document.createElement('div');
      el.className = `mb-sensor ${activeType === p.sensor ? 'highlight' : ''} ${activeType && activeType !== p.sensor ? 'dim' : ''}`;
      el.style.setProperty('--c', sensor.color);
      el.innerHTML = `
        <div class="ring"></div>
        <div class="disc"></div>
        ${tweaks.showLabels ? `<div class="lbl">${p.label}</div>` : ''}
      `;
      // Simple colored-disc marker on the map. The full icon + name is
      // shown in the hover tooltip and the per-site mini legend.
      el.addEventListener('mouseenter', (e) => onSensorHover(p, e));
      el.addEventListener('mousemove', (e) => onSensorMove(e));
      el.addEventListener('mouseleave', () => onSensorLeave());

      const marker = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(gridToLngLat(p.pos))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [ready, activeType, tweaks.enabledSensors, tweaks.showCoverage, tweaks.showLabels, layout]);

  const setView = (p, b) => {
    const map = mapRef.current; if (!map) return;
    map.easeTo({ pitch: p, bearing: b, duration: 500 });
  };

  return (
    <div className="mapbox-wrap">
      <div className="mapbox-site" ref={containerRef}/>

      {/* Map controls overlay */}
      <div className="map-ctrls">
        <div className="mc-group">
          <div className="mc-label">View</div>
          <button onClick={() => setView(0, 0)} title="Top-down (0° pitch)">◼ TOP</button>
          <button onClick={() => setView(45, bearing)} title="Standard 3D">⯅ 3D</button>
          <button onClick={() => setView(75, bearing)} title="Low-angle oblique">◢ LOW</button>
        </div>

        <div className="mc-group">
          <div className="mc-label">Rotate</div>
          <button onClick={() => setView(pitch, bearing - 45)}>↺ -45°</button>
          <button onClick={() => setView(pitch, 0)}>N ↑</button>
          <button onClick={() => setView(pitch, bearing + 45)}>↻ +45°</button>
        </div>

        <div className="mc-group">
          <div className="mc-label">Map Style</div>
          <button className={mapStyle === 'satellite' ? 'on' : ''} onClick={() => setMapStyle('satellite')}>SAT</button>
          <button className={mapStyle === 'dark' ? 'on' : ''} onClick={() => setMapStyle('dark')}>DARK</button>
          <button className={mapStyle === 'streets' ? 'on' : ''} onClick={() => setMapStyle('streets')}>MAP</button>
        </div>

        <div className="mc-readout">
          <span>PITCH <b>{Math.round(pitch)}°</b></span>
          <span>BEARING <b>{Math.round(((bearing%360)+360)%360)}°</b></span>
        </div>
      </div>

      <div className="map-hint">
        RIGHT-CLICK + DRAG · ROTATE &nbsp;·&nbsp; CTRL + DRAG · PITCH &nbsp;·&nbsp; SCROLL · ZOOM
      </div>
    </div>
  );
}

window.MapboxSite = MapboxSite;

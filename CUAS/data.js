// Sensor catalog for DXD Counter-UAS deployment
// Real product classes with representative specs.

window.SENSORS = {
  rf: {
    id: 'rf',
    name: 'RF Detection Array',
    product: 'Dedrone RF-360 / DJI AeroScope class',
    color: '#C8102E',
    short: 'RF',
    role: 'First-look detection + operator geolocation',
    desc: 'Passive radio-frequency sensor that detects drone command-and-control links, video downlinks, and GPS denial signatures. Catalogs 270+ drone protocols including DJI, Autel, Parrot, Skydio. Provides bearing-to-operator within seconds of signal acquisition.',
    specs: [
      ['Detection range', '5 km omnidirectional'],
      ['Frequency bands', '70 MHz – 6 GHz'],
      ['Protocols', '270+ drones classified'],
      ['Operator DF', 'Yes (±5° bearing)'],
      ['Latency', '<1 second'],
      ['Power', 'PoE++ 90W'],
      ['Enclosure', 'IP67, −40 to +70 °C']
    ],
    fns: [
      'Detects UAS before visual/radar range',
      'Identifies make, model, and serial (Remote ID)',
      'Triangulates operator location with 2+ units',
      'Library-matched threat classification',
      'Zero-emission passive (safe around substation gear)'
    ]
  },
  radar: {
    id: 'radar',
    name: '4D AESA Radar',
    product: 'Echodyne EchoGuard / Fortem TrueView R20',
    color: '#2563EB',
    short: 'RAD',
    role: 'Non-cooperative target track',
    desc: 'Solid-state electronically scanned array radar purpose-built for small UAS. Tracks non-emitting / dark drones that RF cannot see, including autonomous and fiber-tethered platforms. Delivers 4D tracks (range, bearing, elevation, Doppler).',
    specs: [
      ['Detection range', '3 km (Group 1 sUAS)'],
      ['Field of regard', '120° AZ × 80° EL'],
      ['Frequency', 'Ku-band (FCC Part 90)'],
      ['Update rate', '1 Hz full volume'],
      ['Simultaneous tracks', '500+'],
      ['Power', '< 50 W'],
      ['Form factor', '28 × 24 × 13 cm']
    ],
    fns: [
      'Detects RF-silent and autonomous drones',
      '4D track handoff to EO/IR for visual ID',
      'Bird / vehicle clutter filtering',
      'Networked mesh for perimeter coverage',
      'FCC-licensed, safe for populated areas'
    ]
  },
  eoir: {
    id: 'eoir',
    name: 'EO/IR PTZ Camera',
    product: 'FLIR Triton PT-Series / Teledyne MCT',
    color: '#FFFFFF',
    short: 'EO/IR',
    role: 'Visual confirmation & payload ID',
    desc: 'Dual-sensor pan-tilt-zoom with cooled MWIR thermal and 30× optical. Slewed to cue by radar or RF. Operator visually confirms target, reads payload (camera / dropper / dummy), and feeds evidence to the legal / response workflow.',
    specs: [
      ['Thermal detection', '5.5 km (DRI standard)'],
      ['Optical zoom', '30× HD (EO)'],
      ['Thermal sensor', 'Cooled MWIR 640×512'],
      ['Pan/tilt', '360° cont. / ±90°'],
      ['Slew rate', '100°/sec'],
      ['Stabilization', '3-axis gyro'],
      ['Environmental', 'IP66, MIL-STD-810G']
    ],
    fns: [
      'Visual confirmation after radar/RF cue',
      'Payload identification (camera vs. weapon)',
      '24/7 operation (thermal bridges night/fog)',
      'Court-admissible evidence capture',
      'Auto-track once target locked'
    ]
  },
  df: {
    id: 'df',
    name: 'Passive RF Direction-Finding',
    product: 'CRFS RFeye Node / DXD FieldArray',
    color: '#E01933',
    short: 'RF-DF',
    role: 'Operator localization',
    desc: 'Multi-node RF array performing time-difference-of-arrival (TDOA) and angle-of-arrival (AOA) to fix the operator — not just the drone. Critical for prosecution, deterrence, and standoff engagement with the human in the loop.',
    specs: [
      ['Operator fix accuracy', '< 25 m @ 3 km'],
      ['Frequency range', '9 kHz – 18 GHz'],
      ['Node spacing', '1–3 km (3+ nodes)'],
      ['Localization method', 'TDOA + AOA fusion'],
      ['Time-to-fix', '3–8 seconds'],
      ['Power', 'DC 24 V, 40 W'],
      ['Data backhaul', 'Fiber or cellular LTE']
    ],
    fns: [
      'Locates the pilot, not just the aircraft',
      'Enables law-enforcement dispatch to operator',
      'Retains data under NIST 800-171 chain-of-custody',
      'Networked fusion across all DXD nodes',
      'Works even when drone is autonomous (catches C2 setup)'
    ]
  },
  acoustic: {
    id: 'acoustic',
    name: 'Acoustic Array',
    product: 'Squarehead Discovair / SARA AMDS',
    color: '#D97706',
    short: 'ACS',
    role: 'Low-altitude / short-range cue',
    desc: 'Microphone array tuned for sUAS rotor and motor signatures. Provides final-mile detection inside RF clutter or urban multipath. Low cost, zero emission, complements radar in the 0–500 m band where RF DF accuracy degrades.',
    specs: [
      ['Detection range', '300–500 m'],
      ['Array', '128-element MEMS'],
      ['Bearing accuracy', '±2°'],
      ['Frequency band', '20 Hz – 20 kHz'],
      ['Power', 'PoE 15 W'],
      ['Weight', '3.2 kg'],
      ['Enclosure', 'IP65']
    ],
    fns: [
      'Short-range confirmation over substation noise floor',
      'Detects small fiber-tethered drones (no RF emission)',
      'Supports urban canyons and heavy foliage',
      'Passive — no regulatory burden',
      'Inexpensive coverage multiplier'
    ]
  },
  pids: {
    id: 'pids',
    name: 'Ground Perimeter Radar',
    product: 'SpotterRF C40 / FLIR Ranger R8SS',
    color: '#2F9E44',
    short: 'PIDS',
    role: 'Fence-line intrusion + drone-drop cue',
    desc: 'Ground-surveillance radar watching the fence line and the immediate interior for human / vehicle intruders and for dropped payloads from overflights. Fused with PTZ EO/IR for auto-follow.',
    specs: [
      ['Detection range (person)', '600 m'],
      ['Detection range (vehicle)', '1,200 m'],
      ['Field of view', '90° sector'],
      ['Bearing accuracy', '±0.5°'],
      ['Power', 'PoE+ 25 W'],
      ['Weight', '1.8 kg'],
      ['Cert', 'UL 2050, FCC ID']
    ],
    fns: [
      'Detects drone-dropped payloads on deck',
      'Tracks ground personnel post-incursion',
      'Fence-line classification (person vs. animal)',
      'Integrates with substation SCADA alarm',
      'Zero false alarms in published DoD testing'
    ]
  },
  c2: {
    id: 'c2',
    name: 'C2 Ops Center',
    product: 'DXD Aegis single-pane / NDAA stack',
    color: '#FFFFFF',
    short: 'C2',
    role: 'Unified command & control',
    desc: 'The single pane of glass. Fuses every sensor, records chain of custody, dispatches response, and holds the human-in-the-loop authorization for any mitigation action. Hosted in GovCloud with Postgres Row-Level Security per site / classification.',
    specs: [
      ['Architecture', 'Next.js + Rust on AWS GovCloud'],
      ['Compliance', 'FedRAMP Moderate, NIST 800-53'],
      ['Data layer', 'Postgres RLS, per-tenant keys'],
      ['Retention', '90 day hot / 7 yr cold'],
      ['Uplink', 'Redundant fiber + LTE + Starshield'],
      ['SIEM', 'Splunk-compatible, syslog TLS'],
      ['Staffing', '24/7 SOC — 2 analyst minimum']
    ],
    fns: [
      'Real-time sensor fusion with <1 s latency',
      'Chain-of-custody recording for prosecution',
      'Direct tie-in to Dominion SCADA / NERC CIP',
      'Automated law-enforcement notification',
      'Remote handoff to DXD 24/7 SOC'
    ]
  },
  daas: {
    id: 'daas',
    name: 'Response Drone (DaaS)',
    product: 'Skydio X10D / BRINC LEMUR — NDAA tier',
    color: '#E01933',
    short: 'DaaS',
    role: 'Airborne intercept & visual escort',
    desc: 'DXD Drone-as-a-Service airframes docked on-site. Launch in <60 seconds on a fused threat track, escort the target to maintain visual, stream thermal + EO to the operator, and document the incident. NDAA-compliant, Remote-ID emitting, BVLOS waivered.',
    specs: [
      ['Launch time', '< 60 seconds from dock'],
      ['Max speed', '45 kt / 83 km/h'],
      ['Endurance', '35 min / airframe'],
      ['Sensors', 'EO 48 MP + thermal FLIR Boson+'],
      ['Autonomy', 'GPS-denied visual SLAM'],
      ['NDAA', 'Blue UAS / Section 848 compliant'],
      ['Waiver', 'BVLOS + OOP on file']
    ],
    fns: [
      'Intercepts & escorts, records prosecution-grade',
      'Closes the standoff gap on bearing to operator',
      'Operator-in-the-loop — no kinetic engagement',
      'Redundant coverage when ground sensors degrade',
      'Same airframes support routine inspection'
    ]
  },
  mit: {
    id: 'mit',
    name: 'Mitigation Effector',
    product: 'D-Fend EnforceAir (cyber) — FAA-restricted',
    color: '#6B0A18',
    short: 'MIT',
    role: 'Non-kinetic takeover (federal-auth only)',
    desc: 'Cyber takeover system. Hijacks the drone control link and lands the target in a predefined safe zone — no jamming, no kinetic, no collateral. Lawful use is restricted to federal agencies under 6 USC §124n / 10 USC §130i. Shown as conditional — DXD deploys under sponsored federal authority or owner-of-airspace model.',
    specs: [
      ['Engagement range', '1.5 km'],
      ['Method', 'Protocol-aware takeover (no RF jam)'],
      ['Collateral RF', 'Zero — surgical waveform'],
      ['Drone library', '200+ models supported'],
      ['Auth gate', 'Federal statutory authority required'],
      ['Logging', 'Immutable chain-of-custody'],
      ['Alt. path', 'Detect-and-track only mode']
    ],
    fns: [
      'Lands drone safely — no debris near grid assets',
      'No jamming — avoids FCC Part 15 violation',
      'Requires 6 USC §124n / DOJ-DHS authority',
      'DXD can operate under sponsored federal model',
      'Detect-only is the default baseline'
    ]
  }
};

// Per-site sensor placements, measured in "grid units" relative to substation center.
// Each unit = 30 meters (for display scaling).
// positions: [xGrid, yGrid] where [0,0] is substation center; positive x right, positive y south.
// coverageRadius in grid units (display) — representative detection ring for hover feedback.

window.SENSOR_PLACEMENTS = [
  // RF primary — 4 units spread across perimeter for operator DF triangulation
  { sensor: 'rf',   id: 'rf-01', pos: [-10, -8], cov: 15, label: 'RF-01' },
  { sensor: 'rf',   id: 'rf-02', pos: [ 10, -8], cov: 15, label: 'RF-02' },
  { sensor: 'rf',   id: 'rf-03', pos: [  0,  10], cov: 15, label: 'RF-03' },

  // DF nodes — separate mast, farther apart for better TDOA baseline
  { sensor: 'df',   id: 'df-01', pos: [-14,  4], cov: 22, label: 'DF-01' },
  { sensor: 'df',   id: 'df-02', pos: [ 14,  4], cov: 22, label: 'DF-02' },

  // Radar — 3 units ringing the station with overlapping 120° arcs
  { sensor: 'radar',id: 'rad-01',pos: [-9, -6], cov: 18, label: 'RAD-01', arc: [-120, -60] },
  { sensor: 'radar',id: 'rad-02',pos: [ 9, -6], cov: 18, label: 'RAD-02', arc: [-60, 0] },
  { sensor: 'radar',id: 'rad-03',pos: [ 0,  9], cov: 18, label: 'RAD-03', arc: [60, 120] },

  // EO/IR — cued slew, positioned near corners for overlap
  { sensor: 'eoir', id: 'eo-01', pos: [-8,  0], cov: 12, label: 'EO-01' },
  { sensor: 'eoir', id: 'eo-02', pos: [ 8,  0], cov: 12, label: 'EO-02' },
  { sensor: 'eoir', id: 'eo-03', pos: [ 0,  8], cov: 12, label: 'EO-03' },
  { sensor: 'eoir', id: 'eo-04', pos: [ 0, -8], cov: 12, label: 'EO-04' },

  // Acoustic — near critical gear
  { sensor: 'acoustic', id: 'acs-01', pos: [-4, -2], cov: 6, label: 'ACS-01' },
  { sensor: 'acoustic', id: 'acs-02', pos: [ 4, -2], cov: 6, label: 'ACS-02' },

  // PIDS — fence line, every corner
  { sensor: 'pids', id: 'pids-01', pos: [-11, -7], cov: 10, label: 'PIDS-01' },
  { sensor: 'pids', id: 'pids-02', pos: [ 11, -7], cov: 10, label: 'PIDS-02' },
  { sensor: 'pids', id: 'pids-03', pos: [-11,  9], cov: 10, label: 'PIDS-03' },
  { sensor: 'pids', id: 'pids-04', pos: [ 11,  9], cov: 10, label: 'PIDS-04' },

  // C2 — control house
  { sensor: 'c2',   id: 'c2-01', pos: [-3, 4], cov: 0, label: 'C2' },

  // DaaS dock
  { sensor: 'daas', id: 'daas-01', pos: [6, 7], cov: 28, label: 'DAAS-DOCK' },

  // Mitigation (optional / restricted)
  { sensor: 'mit',  id: 'mit-01', pos: [-6, 6], cov: 20, label: 'MIT (OPT)' },
];

// Substation physical elements to render on the pad
window.SUBSTATION_ELEMENTS = [
  // Transformers (red-bordered)
  { type: 'xfmr', pos: [-5, -3], w: 3, h: 2, label: '230kV XFMR-A' },
  { type: 'xfmr', pos: [-1, -3], w: 3, h: 2, label: '230kV XFMR-B' },
  { type: 'xfmr', pos: [ 3, -3], w: 3, h: 2, label: '230kV XFMR-C' },
  // Switchgear bays
  { type: 'switch', pos: [-8,  0], w: 2, h: 4, label: 'BAY-1' },
  { type: 'switch', pos: [-5,  0], w: 2, h: 4, label: 'BAY-2' },
  { type: 'switch', pos: [-2,  0], w: 2, h: 4, label: 'BAY-3' },
  { type: 'switch', pos: [ 1,  0], w: 2, h: 4, label: 'BAY-4' },
  { type: 'switch', pos: [ 4,  0], w: 2, h: 4, label: 'BAY-5' },
  { type: 'switch', pos: [ 7,  0], w: 2, h: 4, label: 'BAY-6' },
  // Control house
  { type: 'ctrl', pos: [-4,  5], w: 4, h: 2, label: 'CONTROL HOUSE' },
  // Reactor / capacitor bank
  { type: 'switch', pos: [ 4,  5], w: 3, h: 2, label: 'CAP BANK' },
];

// Per-site 3D layouts — shape + element grid + sensor placements per site.
// Each site gets a distinct footprint reflecting its real-world character:
//   chesterfield  → large generation complex + 230kV switchyard (rectangular sprawl)
//   twelfth       → urban distribution hub (compact square, fenced yard)
//   lakeside      → transmission switching (mid-size, L-shape)
window.SITE_LAYOUTS = {
  chesterfield: {
    perimeter: { w: 540, h: 380 },
    elements: [
      // 230kV transformer row
      { type: 'xfmr', pos: [-7, -4], w: 3, h: 2.4, label: '230 XFMR A' },
      { type: 'xfmr', pos: [-3, -4], w: 3, h: 2.4, label: '230 XFMR B' },
      { type: 'xfmr', pos: [ 1, -4], w: 3, h: 2.4, label: '230 XFMR C' },
      { type: 'xfmr', pos: [ 5, -4], w: 3, h: 2.4, label: '230 XFMR D' },
      // Switchgear bays
      { type: 'switch', pos: [-8,  0], w: 1.6, h: 4, label: 'BAY-1' },
      { type: 'switch', pos: [-5,  0], w: 1.6, h: 4, label: 'BAY-2' },
      { type: 'switch', pos: [-2,  0], w: 1.6, h: 4, label: 'BAY-3' },
      { type: 'switch', pos: [ 1,  0], w: 1.6, h: 4, label: 'BAY-4' },
      { type: 'switch', pos: [ 4,  0], w: 1.6, h: 4, label: 'BAY-5' },
      { type: 'switch', pos: [ 7,  0], w: 1.6, h: 4, label: 'BAY-6' },
      // Control + cap
      { type: 'ctrl',   pos: [-5,  5], w: 4, h: 2, label: 'CONTROL HOUSE' },
      { type: 'switch', pos: [ 4,  5], w: 3, h: 2, label: 'CAP BANK' },
    ],
    sensors: [
      { sensor: 'rf',       id: 'ch-rf-01', pos: [-11, -7], cov: 15, label: 'RF-01' },
      { sensor: 'rf',       id: 'ch-rf-02', pos: [ 11, -7], cov: 15, label: 'RF-02' },
      { sensor: 'rf',       id: 'ch-rf-03', pos: [  0,  9], cov: 15, label: 'RF-03' },
      { sensor: 'df',       id: 'ch-df-01', pos: [-14,  4], cov: 22, label: 'DF-01' },
      { sensor: 'df',       id: 'ch-df-02', pos: [ 14,  4], cov: 22, label: 'DF-02' },
      { sensor: 'radar',    id: 'ch-rad-01',pos: [-10, -6], cov: 18, label: 'RAD-01' },
      { sensor: 'radar',    id: 'ch-rad-02',pos: [ 10, -6], cov: 18, label: 'RAD-02' },
      { sensor: 'radar',    id: 'ch-rad-03',pos: [  0,  8], cov: 18, label: 'RAD-03' },
      { sensor: 'eoir',     id: 'ch-eo-01', pos: [-9,  2], cov: 12, label: 'EO-01' },
      { sensor: 'eoir',     id: 'ch-eo-02', pos: [ 9,  2], cov: 12, label: 'EO-02' },
      { sensor: 'eoir',     id: 'ch-eo-03', pos: [ 0, -7], cov: 12, label: 'EO-03' },
      { sensor: 'eoir',     id: 'ch-eo-04', pos: [ 0,  7], cov: 12, label: 'EO-04' },
      { sensor: 'acoustic', id: 'ch-acs-01',pos: [-4, -1], cov: 6,  label: 'ACS-01' },
      { sensor: 'acoustic', id: 'ch-acs-02',pos: [ 4, -1], cov: 6,  label: 'ACS-02' },
      { sensor: 'pids',     id: 'ch-pids-01',pos: [-12, -8], cov: 10, label: 'PIDS-01' },
      { sensor: 'pids',     id: 'ch-pids-02',pos: [ 12, -8], cov: 10, label: 'PIDS-02' },
      { sensor: 'pids',     id: 'ch-pids-03',pos: [-12,  8], cov: 10, label: 'PIDS-03' },
      { sensor: 'pids',     id: 'ch-pids-04',pos: [ 12,  8], cov: 10, label: 'PIDS-04' },
      { sensor: 'c2',       id: 'ch-c2-01', pos: [-3,  5], cov: 0,  label: 'C2' },
      { sensor: 'daas',     id: 'ch-daas-01',pos: [ 7,  7], cov: 28, label: 'DAAS-DOCK' },
      { sensor: 'mit',      id: 'ch-mit-01',pos: [-6,  6], cov: 20, label: 'MIT (OPT)' },
    ],
  },
  twelfth: {
    perimeter: { w: 300, h: 280 },
    elements: [
      // Compact urban yard — stacked equipment
      { type: 'xfmr',   pos: [-3, -3], w: 2.2, h: 2,   label: '115 XFMR-A' },
      { type: 'xfmr',   pos: [ 0, -3], w: 2.2, h: 2,   label: '115 XFMR-B' },
      { type: 'xfmr',   pos: [ 3, -3], w: 2.2, h: 2,   label: '115 XFMR-C' },
      { type: 'switch', pos: [-4,  0], w: 1.4, h: 3,   label: 'BAY-1' },
      { type: 'switch', pos: [-2,  0], w: 1.4, h: 3,   label: 'BAY-2' },
      { type: 'switch', pos: [ 0,  0], w: 1.4, h: 3,   label: 'BAY-3' },
      { type: 'switch', pos: [ 2,  0], w: 1.4, h: 3,   label: 'BAY-4' },
      { type: 'switch', pos: [ 4,  0], w: 1.4, h: 3,   label: 'BAY-5' },
      { type: 'ctrl',   pos: [ 0,  4], w: 4,   h: 1.8, label: 'CONTROL HOUSE' },
    ],
    sensors: [
      // Dense urban → fewer sensors, closer in. Skip ACS/MIT (noise/optics).
      { sensor: 'rf',       id: 't-rf-01',  pos: [-6, -5], cov: 12, label: 'RF-01' },
      { sensor: 'rf',       id: 't-rf-02',  pos: [ 6, -5], cov: 12, label: 'RF-02' },
      { sensor: 'df',       id: 't-df-01',  pos: [ 0,  7], cov: 18, label: 'DF-01' },
      { sensor: 'radar',    id: 't-rad-01', pos: [-6,  3], cov: 14, label: 'RAD-01' },
      { sensor: 'radar',    id: 't-rad-02', pos: [ 6,  3], cov: 14, label: 'RAD-02' },
      { sensor: 'eoir',     id: 't-eo-01',  pos: [-5,  0], cov: 10, label: 'EO-01' },
      { sensor: 'eoir',     id: 't-eo-02',  pos: [ 5,  0], cov: 10, label: 'EO-02' },
      { sensor: 'pids',     id: 't-pids-01',pos: [-7, -6], cov: 8,  label: 'PIDS-01' },
      { sensor: 'pids',     id: 't-pids-02',pos: [ 7, -6], cov: 8,  label: 'PIDS-02' },
      { sensor: 'pids',     id: 't-pids-03',pos: [-7,  6], cov: 8,  label: 'PIDS-03' },
      { sensor: 'pids',     id: 't-pids-04',pos: [ 7,  6], cov: 8,  label: 'PIDS-04' },
      { sensor: 'c2',       id: 't-c2-01',  pos: [ 2,  4], cov: 0,  label: 'C2' },
      { sensor: 'daas',     id: 't-daas-01',pos: [ 0, -7], cov: 22, label: 'DAAS-DOCK' },
    ],
  },
  lakeside: {
    perimeter: { w: 420, h: 340 },
    elements: [
      { type: 'xfmr',   pos: [-5, -3], w: 2.6, h: 2, label: '230 XFMR-A' },
      { type: 'xfmr',   pos: [-1, -3], w: 2.6, h: 2, label: '230 XFMR-B' },
      { type: 'xfmr',   pos: [ 3, -3], w: 2.6, h: 2, label: '230 XFMR-C' },
      { type: 'switch', pos: [-6,  0], w: 1.5, h: 3.5, label: 'BAY-1' },
      { type: 'switch', pos: [-3,  0], w: 1.5, h: 3.5, label: 'BAY-2' },
      { type: 'switch', pos: [ 0,  0], w: 1.5, h: 3.5, label: 'BAY-3' },
      { type: 'switch', pos: [ 3,  0], w: 1.5, h: 3.5, label: 'BAY-4' },
      { type: 'switch', pos: [ 6,  0], w: 1.5, h: 3.5, label: 'BAY-5' },
      { type: 'ctrl',   pos: [-3,  5], w: 3.5, h: 1.8, label: 'CONTROL HOUSE' },
      { type: 'switch', pos: [ 4,  5], w: 2.5, h: 1.8, label: 'CAP BANK' },
    ],
    sensors: [
      { sensor: 'rf',       id: 'l-rf-01',  pos: [-9, -6], cov: 14, label: 'RF-01' },
      { sensor: 'rf',       id: 'l-rf-02',  pos: [ 9, -6], cov: 14, label: 'RF-02' },
      { sensor: 'rf',       id: 'l-rf-03',  pos: [ 0,  8], cov: 14, label: 'RF-03' },
      { sensor: 'df',       id: 'l-df-01',  pos: [-11,  3], cov: 20, label: 'DF-01' },
      { sensor: 'df',       id: 'l-df-02',  pos: [ 11,  3], cov: 20, label: 'DF-02' },
      { sensor: 'radar',    id: 'l-rad-01', pos: [-8, -5], cov: 16, label: 'RAD-01' },
      { sensor: 'radar',    id: 'l-rad-02', pos: [ 8, -5], cov: 16, label: 'RAD-02' },
      { sensor: 'radar',    id: 'l-rad-03', pos: [ 0,  7], cov: 16, label: 'RAD-03' },
      { sensor: 'eoir',     id: 'l-eo-01',  pos: [-7,  1], cov: 11, label: 'EO-01' },
      { sensor: 'eoir',     id: 'l-eo-02',  pos: [ 7,  1], cov: 11, label: 'EO-02' },
      { sensor: 'eoir',     id: 'l-eo-03',  pos: [ 0, -6], cov: 11, label: 'EO-03' },
      { sensor: 'acoustic', id: 'l-acs-01', pos: [ 0, -1], cov: 6,  label: 'ACS-01' },
      { sensor: 'pids',     id: 'l-pids-01',pos: [-10, -7], cov: 9, label: 'PIDS-01' },
      { sensor: 'pids',     id: 'l-pids-02',pos: [ 10, -7], cov: 9, label: 'PIDS-02' },
      { sensor: 'pids',     id: 'l-pids-03',pos: [-10,  7], cov: 9, label: 'PIDS-03' },
      { sensor: 'pids',     id: 'l-pids-04',pos: [ 10,  7], cov: 9, label: 'PIDS-04' },
      { sensor: 'c2',       id: 'l-c2-01',  pos: [-3,  5], cov: 0, label: 'C2' },
      { sensor: 'daas',     id: 'l-daas-01',pos: [ 6,  7], cov: 26, label: 'DAAS-DOCK' },
    ],
  },
};

// Sources & citations — every non-obvious number or claim in the deck
// traces back to one of these. Displayed in the closing Sources scene.
window.SOURCES = [
  // Threat / incident statistics
  { id: 'dhs-2024', label: 'DHS CISA — Insights: "UAS Incidents at Critical Infrastructure" (2024)',
    url: 'https://www.cisa.gov/topics/physical-security/unmanned-aircraft-systems',
    supports: ['Threat incident uptick at US utility sites', 'Substation reconnaissance pattern'] },
  { id: 'ferc-2023', label: 'FERC / DOE — "Physical Security of the U.S. Power Grid" staff report (2023)',
    url: 'https://www.energy.gov/ceser/articles/physical-security-us-power-grid',
    supports: ['Substation physical attack trends 2022-2024', 'Moore County, NC precedent'] },
  { id: 'nerc-cip-014', label: 'NERC Reliability Standard CIP-014-3 — Physical Security',
    url: 'https://www.nerc.com/pa/Stand/Pages/CIP0143RI.aspx',
    supports: ['CIP-014 physical security obligation', 'Critical asset identification'] },
  { id: 'nerc-cip-008', label: 'NERC Reliability Standard CIP-008-6 — Incident Reporting',
    url: 'https://www.nerc.com/pa/Stand/Pages/CIP0086RI.aspx',
    supports: ['CIP-008 incident reporting obligation'] },
  // FAA / airspace
  { id: 'faa-2209', label: 'FAA Reauthorization Act of 2018 — Section 2209 (critical-infrastructure airspace restrictions)',
    url: 'https://www.faa.gov/uas/advanced_operations/section_2209',
    supports: ['FAA §2209 critical-infrastructure restrictions'] },
  { id: 'faa-partB', label: 'FAA Remote ID Rule — 14 CFR Part 89',
    url: 'https://www.faa.gov/uas/getting_started/remote_id',
    supports: ['Remote-ID broadcast requirement', 'Spoofed-Remote-ID concerns'] },
  // Federal mitigation authority
  { id: '6usc124n', label: '6 USC §124n — DHS Counter-UAS Authority',
    url: 'https://www.law.cornell.edu/uscode/text/6/124n',
    supports: ['DHS mitigation authority', 'Restriction on non-federal mitigation'] },
  { id: '10usc130i', label: '10 USC §130i — DoD Counter-UAS Authority',
    url: 'https://www.law.cornell.edu/uscode/text/10/130i',
    supports: ['DoD mitigation authority'] },
  { id: 'doj-2020', label: 'DOJ / FAA / DHS / FCC joint advisory — "Advisory on the Application of Federal Laws to the Acquisition and Use of Technology to Detect and Mitigate UAS" (2020)',
    url: 'https://www.justice.gov/d9/pages/attachments/2020/08/18/advisory_on_the_application_of_federal_laws_to_the_acquisition_and_use_of_technology_to_detect_and_mitigate_unmanned_aircraft_systems.pdf',
    supports: ['Legal constraints on non-federal drone mitigation', 'Cyber / RF regulatory overlap'] },
  // NDAA / supply chain
  { id: 'ndaa-848', label: 'NDAA FY 2020 — §848 (covered-entity prohibition on DoD UAS purchases)',
    url: 'https://www.congress.gov/bill/116th-congress/senate-bill/1790',
    supports: ['Section 848 / Blue UAS compliance', 'Covered-entity supply chain exclusion'] },
  { id: 'blueuas', label: 'DIU Blue UAS Cleared List',
    url: 'https://www.diu.mil/blue-uas-cleared-list',
    supports: ['NDAA-cleared airframes'] },
  // Cloud / data compliance
  { id: 'fedramp', label: 'FedRAMP Moderate Baseline (GovCloud hosting)',
    url: 'https://www.fedramp.gov/understanding-baselines-and-impact-levels/',
    supports: ['FedRAMP Moderate hosting', 'NIST 800-53 control mapping'] },
  { id: 'nist800171', label: 'NIST SP 800-171 Rev. 2 — Protecting CUI',
    url: 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final',
    supports: ['CUI handling', 'Chain of custody'] },
  // Industry / precedent
  { id: 'moore-nc', label: 'Moore County NC substation attack (2022)',
    url: 'https://www.reuters.com/world/us/gunfire-damages-two-power-substations-north-carolina-2022-12-04/',
    supports: ['Physical-attack precedent', 'Duration-of-outage cost'] },
  { id: 'langley-2023', label: 'JBLE Langley unexplained UAS incursions (Dec 2023)',
    url: 'https://www.wsj.com/politics/national-security/mysterious-drone-incursions-at-langley-exposed-holes-in-u-s-defenses-8ac9d8d3',
    supports: ['Unattributed drone incursions over sensitive US sites'] },
  { id: 'gao-24', label: 'GAO-24-106797 — Counter-UAS protection of critical infrastructure (2024)',
    url: 'https://www.gao.gov/products/gao-24-106797',
    supports: ['Federal gap analysis for CI counter-UAS', 'Authority fragmentation'] },
  // Sensor vendors referenced as product class (not endorsement)
  { id: 'dedrone', label: 'Dedrone RF Sensor / Protocol Library',
    url: 'https://www.dedrone.com/',
    supports: ['RF-360 sensor class', '270+ drone protocol library'] },
  { id: 'echodyne', label: 'Echodyne EchoGuard / EchoShield radar',
    url: 'https://www.echodyne.com/',
    supports: ['ESA radar specs', 'Group 1 sUAS detection range'] },
  { id: 'flir', label: 'FLIR Triton / Ranger PTZ & ground radar datasheets',
    url: 'https://www.flir.com/',
    supports: ['EO/IR camera range', 'PIDS ground radar'] },
  { id: 'spotter', label: 'SpotterRF C40 ground-surveillance radar datasheet',
    url: 'https://spotterrf.com/',
    supports: ['Ground radar person/vehicle ranges'] },
  { id: 'skydio', label: 'Skydio X10D datasheet (NDAA-compliant)',
    url: 'https://www.skydio.com/',
    supports: ['DaaS response drone specs', 'NDAA / Blue UAS status'] },
  { id: 'dfend', label: 'D-Fend EnforceAir cyber-takeover system',
    url: 'https://www.d-fendsolutions.com/',
    supports: ['Cyber mitigation product class', 'Non-jamming takeover'] },
  { id: 'crfs', label: 'CRFS RFeye Node multi-site TDOA/AOA',
    url: 'https://www.crfs.com/',
    supports: ['Operator geolocation TDOA/AOA accuracy'] },
];

// 3 Dominion Richmond VA sites — all inside the Richmond metro.
// Map coords are lat/long of actual/representative stations; mapX/mapY are
// percentages into the SVG frame (see scenes-map.jsx bounds: 77.65W..77.30W,
// 37.30N..37.70N — Richmond metro bounding box).
window.SITES = [
  {
    id: 'chesterfield',
    name: 'Chesterfield Power Station',
    type: 'Generation + 230 kV Switchyard',
    voltage: '230 / 115 kV',
    lat: 37.3832, lng: -77.3821,
    coord: '37.3832°N · 77.3821°W',
    locality: 'Chester, Chesterfield County · South Richmond',
    priority: 'TIER-1',
    acreage: '1,200 ac',
    threats: 17,
    notes: 'Largest generation complex south of Richmond; James River frontage.',
    // Mapbox: how many real-world meters each grid unit represents, and
    // the default close-up zoom.
    metersPerUnit: 4.0,
    mapZoomTight: 16.2,
    mapZoomWide: 13.5,
    mapBearing: -15,
  },
  {
    id: 'twelfth',
    name: 'Twelfth Street Substation',
    type: 'Downtown Distribution Hub',
    voltage: '115 / 34.5 kV',
    lat: 37.5396, lng: -77.4300,
    coord: '37.5396°N · 77.4300°W',
    locality: 'Shockoe Slip, City of Richmond',
    priority: 'TIER-1',
    acreage: '2.1 ac',
    threats: 11,
    notes: 'Feeds Richmond CBD / State Capitol / MCV Hospital; canal-adjacent, currently under expansion.',
    metersPerUnit: 1.4,
    mapZoomTight: 17.6,
    mapZoomWide: 14.5,
    mapBearing: 20,
  },
  {
    id: 'lakeside',
    name: 'Lakeside Transmission Station',
    type: 'Transmission Switching',
    voltage: '230 / 115 kV',
    lat: 37.6250, lng: -77.4748,
    coord: '37.6250°N · 77.4748°W',
    locality: 'Henrico County · North Richmond',
    priority: 'TIER-2',
    acreage: '64 ac',
    threats: 6,
    notes: 'Key north-side transmission node; adjacent to I-95 corridor.',
    metersPerUnit: 2.8,
    mapZoomTight: 16.4,
    mapZoomWide: 13.8,
    mapBearing: 0,
  }
];

// Map view bounds. North-up.
window.MAP_BOUNDS = {
  n: 37.70, s: 37.30, w: -77.65, e: -77.30,
};
// Precompute mapX/mapY (% into frame) from lat/lng
(function(){
  const b = window.MAP_BOUNDS;
  window.SITES.forEach(s => {
    s.mapX = ((s.lng - b.w) / (b.e - b.w)) * 100;
    s.mapY = ((b.n - s.lat) / (b.n - b.s)) * 100;
  });
})();

// =====================================================================
// LIVE SCENARIO — rogue drone incident at Chesterfield Power Station.
// 8 scroll-driven steps; each step: narrative, map state, C2 panel state,
// and which federation channels have fired.
// =====================================================================

// Federation channels — recipients that receive automatic notification
// via the DXD Aegis C2 platform on every confirmed rogue drone/pilot event.
window.FEDERATION_CHANNELS = [
  // Federal
  { id: 'fbi',    tier: 'FED',   agency: 'FBI',              unit: 'WMD Directorate · Richmond Field Office', channel: 'eGuardian · TS/SCI' },
  { id: 'cisa',   tier: 'FED',   agency: 'DHS CISA',         unit: 'Emergency Communications Division',       channel: 'Homeland Security Information Network (HSIN)' },
  { id: 'faa',    tier: 'FED',   agency: 'FAA',              unit: 'Domestic Events Network (DEN)',           channel: 'DEN audio bridge · TFR request' },
  { id: 'tsoc',   tier: 'FED',   agency: 'TSA',              unit: 'Transportation Security Ops Center',      channel: 'TSOC secure line' },
  // State
  { id: 'vafc',   tier: 'STATE', agency: 'VA Fusion Center', unit: 'Critical Infrastructure desk',            channel: 'RISSNET · VFC-SAR' },
  { id: 'vsp',    tier: 'STATE', agency: 'VA State Police',  unit: 'Bureau of Criminal Investigation · CI Unit', channel: 'VCIN · encrypted radio' },
  { id: 'veoc',   tier: 'STATE', agency: 'VA EOC',           unit: 'Virginia Emergency Operations Center',    channel: 'WebEOC' },
  // Local
  { id: 'ccso',   tier: 'LOCAL', agency: 'Chesterfield Co.', unit: 'Sheriff · Patrol + CID',                  channel: 'CAD · MDT dispatch' },
  { id: 'cc911',  tier: 'LOCAL', agency: 'Chesterfield Co.', unit: 'Emergency Communications · 911 PSAP',     channel: 'E911 CAD integration' },
  // Utility / reliability
  { id: 'dsoc',   tier: 'UTIL',  agency: 'Dominion Energy',  unit: 'Security Operations Center',              channel: 'Dominion SOC · SCADA tie-in' },
  { id: 'eisac',  tier: 'UTIL',  agency: 'NERC E-ISAC',      unit: 'Electricity Information Sharing · Analysis', channel: 'CRISP / E-ISAC portal' },
  { id: 'pjm',    tier: 'UTIL',  agency: 'PJM',              unit: 'Reliability Coordinator · Security desk', channel: 'PJM OMS secure feed' },
];

// Incident narrative — each step = one "beat" of the scenario.
// ids in sensorsActive / channelsFired reference the sensor placement ids
// in window.SITE_LAYOUTS.chesterfield.sensors and FEDERATION_CHANNELS above.
// dronePath runs along a fixed polyline from NW approach → over-site → return.
// droneT is a 0..1 position along that polyline for this step.
// pilotShown: whether the triangulated pilot marker is visible.
// alertLevel: 'nominal' | 'yellow' | 'amber' | 'red' | 'handoff' | 'resolved'
window.SCENARIO_STEPS = [
  {
    step: 0, t: 'T+00:00:00', label: 'BASELINE',
    title: 'Sector nominal',
    caption: 'All perimeter sensors online. No tracks. Weather CAVOK. Airspace clear per FAA DEN. Dominion SOC shift change at 06:00 — DXD watch standing.',
    alertLevel: 'nominal',
    droneT: null,            // no drone present
    pilotShown: false,
    sensorsActive: [],
    sensorsAlert: [],
    channelsFired: [],
    logLines: [
      { t: 'T+00:00:00', sys: 'DXD-AEGIS', type: 'info', msg: 'Watch on. Chesterfield sector nominal. 21 sensors online. Coverage 100%.' },
      { t: 'T-00:04:12', sys: 'WX',        type: 'info', msg: 'METAR KRIC 060654Z VRB03KT 10SM FEW250 06/M02 A3012 — flight conditions CAVOK.' },
    ],
  },
  {
    step: 1, t: 'T+00:00:04', label: 'FIRST CONTACT',
    title: 'Unknown RF emission · NW perimeter',
    caption: 'RF-01 registers a DJI OcuSync-class emission at 2.4 GHz, bearing 312°. No Remote ID broadcast. RF-02 corroborates within one second. Track promoted to pre-track.',
    alertLevel: 'yellow',
    droneT: 0.08,
    pilotShown: false,
    sensorsActive: ['ch-rf-01','ch-rf-02'],
    sensorsAlert: ['ch-rf-01'],
    channelsFired: [],
    logLines: [
      { t: 'T+00:00:04', sys: 'RF-01',     type: 'warn', msg: 'RF emission · DJI OcuSync-2 · 2.4 GHz · bearing 312° · RSSI -58 dBm' },
      { t: 'T+00:00:05', sys: 'RF-02',     type: 'warn', msg: 'Corroborating emission · bearing 298° · cross-fix converges 1.4 km NW' },
      { t: 'T+00:00:05', sys: 'DXD-AEGIS', type: 'warn', msg: 'Pre-track promoted · NO REMOTE ID BROADCAST · unauthorized per §2209 airspace' },
    ],
  },
  {
    step: 2, t: 'T+00:00:11', label: 'RADAR + EO CONFIRM',
    title: 'Non-cooperative track · visual lock',
    caption: 'Radar RAD-01 acquires non-cooperative return, RCS 0.02 m² — consistent with Group-1 sUAS. EO-02 slews to cue, locks camera, confirms rotor signature. Track UAS-01 established. Alert → AMBER.',
    alertLevel: 'amber',
    droneT: 0.22,
    pilotShown: false,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02'],
    sensorsAlert: ['ch-rad-01','ch-eo-02'],
    channelsFired: [],
    logLines: [
      { t: 'T+00:00:11', sys: 'RAD-01',    type: 'warn', msg: 'Non-cooperative track · RCS 0.02 m² · alt 120 m AGL · speed 11 m/s SE' },
      { t: 'T+00:00:12', sys: 'EO-02',     type: 'warn', msg: 'Slew-to-cue complete · visual lock · rotor sig confirmed · payload = camera gimbal' },
      { t: 'T+00:00:13', sys: 'DXD-AEGIS', type: 'warn', msg: 'Track UAS-01 established · platform class: DJI M300 RTK · ALERT → AMBER' },
    ],
  },
  {
    step: 3, t: 'T+00:00:18', label: 'OPERATOR DF',
    title: 'Pilot triangulated across the river',
    caption: 'DF-01 and DF-02 compute operator bearing. TDOA fusion fixes the pilot on the James River east bank — public boat launch, Dutch Gap. Pilot marker drops on overview map with ±22 m CEP.',
    alertLevel: 'amber',
    droneT: 0.36,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02'],
    sensorsAlert: ['ch-df-01','ch-df-02'],
    channelsFired: [],
    logLines: [
      { t: 'T+00:00:18', sys: 'DF-01',     type: 'warn', msg: 'Operator bearing 048° · ±5°' },
      { t: 'T+00:00:19', sys: 'DF-02',     type: 'warn', msg: 'Operator bearing 312° · ±5° · TDOA cross-fix' },
      { t: 'T+00:00:20', sys: 'DXD-AEGIS', type: 'warn', msg: 'Pilot fix · 37.3876°N 77.3724°W · ±22 m CEP · Dutch Gap boat launch · public access' },
    ],
  },
  {
    step: 4, t: 'T+00:00:26', label: 'CLASSIFICATION + FEDERATION',
    title: 'Confirmed threat · federation fires',
    caption: 'Fusion engine resolves the track against DXD\'s threat library — this serial has two prior incursions in 2025-Q4. Classification: RECON. Alert → RED. The C2 platform automatically notifies federal, state, local, and utility partners — each on their native channel. Chain-of-custody sealed.',
    alertLevel: 'red',
    droneT: 0.50,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02','ch-c2-01'],
    sensorsAlert: ['ch-c2-01'],
    channelsFired: ['fbi','cisa','faa','tsoc','vafc','vsp','veoc','ccso','cc911','dsoc','eisac','pjm'],
    logLines: [
      { t: 'T+00:00:26', sys: 'DXD-AEGIS', type: 'fire', msg: 'Threat library hit · serial 1581F-… · 2 priors · class RECON · ALERT → RED' },
      { t: 'T+00:00:27', sys: 'FEDERATION', type: 'fire', msg: 'Auto-notify fired · 12 channels · FED / STATE / LOCAL / UTIL' },
      { t: 'T+00:00:28', sys: 'CoC',       type: 'info', msg: 'Evidence bundle opened · SHA-256 chain seeded · NIST 800-171 locker' },
    ],
  },
  {
    step: 5, t: 'T+00:00:34', label: 'COORDINATED RESPONSE',
    title: 'Manned teams mobilizing',
    caption: 'Chesterfield County Sheriff units staged from the Dutch Gap side. DXD on-site security moves to hardened posture. FAA files emergency TFR request to clear the block. Dominion SOC assumes joint watch.',
    alertLevel: 'red',
    droneT: 0.66,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02','ch-c2-01','ch-pids-01','ch-pids-02','ch-pids-03','ch-pids-04'],
    sensorsAlert: ['ch-pids-01','ch-pids-02','ch-pids-03','ch-pids-04'],
    channelsFired: ['fbi','cisa','faa','tsoc','vafc','vsp','veoc','ccso','cc911','dsoc','eisac','pjm'],
    showResponse: { sheriff: true, dxd: true },
    logLines: [
      { t: 'T+00:00:34', sys: 'CCSO',      type: 'info', msg: 'Two patrol units dispatched · Dutch Gap side · ETA 4 min · CAD Inc #2026-CHE-0173' },
      { t: 'T+00:00:36', sys: 'DXD-OPS',   type: 'info', msg: 'On-site team to hardened posture · control-house lockdown · perimeter patrol doubled' },
      { t: 'T+00:00:41', sys: 'FAA-DEN',   type: 'info', msg: 'Emergency TFR request filed · 1 NM / SFC-400 AGL · pending issuance' },
    ],
  },
  {
    step: 6, t: 'T+00:00:42', label: 'INTERCEPT LAUNCH',
    title: 'DXD operator launches interceptor',
    caption: 'Airspace ownership in hand, DXD watch-floor operator Sgt. Marquez (call-sign DXD-AIR-01) launches a Skydio X10D from the rooftop cradle. Autonomous climb to 140 m AGL, auto-route to intercept bearing 312°. EO/IR on, recorder hot, chain-of-custody timer running.',
    alertLevel: 'red',
    droneT: 0.72,
    interceptT: 0.00,
    interceptShown: true,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02','ch-c2-01','ch-pids-01','ch-pids-02','ch-pids-03','ch-pids-04'],
    sensorsAlert: ['ch-c2-01'],
    channelsFired: ['fbi','cisa','faa','tsoc','vafc','vsp','veoc','ccso','cc911','dsoc','eisac','pjm'],
    showResponse: { sheriff: true, dxd: true },
    interceptActive: true,
    commsShown: false,
    logLines: [
      { t: 'T+00:00:42', sys: 'DXD-AIR-01', type: 'fire', msg: 'Interceptor launch authorized · Sgt. M. Marquez · Skydio X10D · tail N4412X' },
      { t: 'T+00:00:44', sys: 'AEGIS-AIR',  type: 'info', msg: 'Climbing · 140 m AGL · auto-route to target · EO/IR armed · record on' },
      { t: 'T+00:00:46', sys: 'FAA-DEN',    type: 'info', msg: 'TFR granted · 1 NM / SFC-400 AGL · letter of agreement CHE-LOA-04 active' },
    ],
  },
  {
    step: 7, t: 'T+00:00:58', label: 'SHADOW + HAIL',
    title: 'Interceptor shadowing · two-way hail opened',
    caption: 'DXD-AIR-01 pulls into a 40 m trail on UAS-01 and holds station. Operator broadcasts a two-way hail on the rogue\'s command channel (DJI AeroScope-seeded RID bridge) and over 121.5 MHz guard: "Unknown UAS operating over Chesterfield Power Station — you are in restricted airspace under FAA TFR. Land immediately. Law enforcement is en route to your position at Dutch Gap." Response teams pinged in parallel.',
    alertLevel: 'red',
    droneT: 0.80,
    interceptT: 0.55,
    interceptShown: true,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02','ch-c2-01','ch-eo-01','ch-eo-03','ch-eo-04'],
    sensorsAlert: ['ch-eo-01','ch-eo-03','ch-eo-04'],
    channelsFired: ['fbi','cisa','faa','tsoc','vafc','vsp','veoc','ccso','cc911','dsoc','eisac','pjm'],
    showResponse: { sheriff: true, dxd: true },
    interceptActive: true,
    commsShown: true,
    comms: [
      { from: 'DXD-AIR-01', role: 'DXD OPERATOR', side: 'ops', t: 'T+00:00:59', msg: 'Station on UAS-01 · 40 m trail · visual on airframe · hailing now.' },
      { from: 'DXD-AIR-01', role: 'HAIL · RID BRIDGE + 121.5', side: 'hail',  t: 'T+00:01:02', msg: 'Unknown UAS over Chesterfield Power — restricted airspace under active FAA TFR. Land immediately and remain with your aircraft. Chesterfield County Sheriff is en route.' },
      { from: 'DXD-OPS',    role: 'TEAM PAGE · CCSO + DXD GROUND', side: 'page', t: 'T+00:01:03', msg: 'SITREP to CCSO Patrol-1, Patrol-2, DXD ground team 3 · operator @ Dutch Gap boat launch · ±22 m · grey sedan suspect vehicle.' },
    ],
    logLines: [
      { t: 'T+00:00:58', sys: 'DXD-AIR-01', type: 'info', msg: 'Merge complete · trail 40 m · altitude matched · EO on UAS-01' },
      { t: 'T+00:01:02', sys: 'HAIL',       type: 'fire', msg: 'Two-way hail TX · RID-bridge + 121.5 guard · 3× repeat, 5-sec intervals' },
      { t: 'T+00:01:03', sys: 'DXD-OPS',    type: 'info', msg: 'Response teams paged · CCSO Patrol-1/2 · DXD Ground-3 · ETA sheriff 90s' },
    ],
  },
  {
    step: 8, t: 'T+00:01:18', label: 'PILOT COMPLIES',
    title: 'Rogue acknowledges · descending',
    caption: 'Pilot keys the command-link mic: "Copy, DXD. I didn\'t know. Landing now." UAS-01 transitions to auto-land, descent rate 2 m/s. DXD-AIR-01 maintains EO lock through touchdown. Evidence bundle captures audio, video, RF fingerprint, and pilot fix. Sheriff closes the last 400 meters.',
    alertLevel: 'handoff',
    droneT: 0.92,
    interceptT: 0.80,
    interceptShown: true,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02','ch-c2-01','ch-eo-01','ch-eo-03','ch-eo-04'],
    sensorsAlert: [],
    channelsFired: ['fbi','cisa','faa','tsoc','vafc','vsp','veoc','ccso','cc911','dsoc','eisac','pjm'],
    showResponse: { sheriff: true, dxd: true },
    interceptActive: true,
    commsShown: true,
    comms: [
      { from: 'UAS-01 PILOT', role: 'ROGUE OPERATOR', side: 'pilot', t: 'T+00:01:18', msg: 'Copy, DXD. I didn\'t know this was restricted. Landing now — stand by.' },
      { from: 'DXD-AIR-01', role: 'DXD OPERATOR', side: 'ops',   t: 'T+00:01:20', msg: 'Roger. Descend to ground, step away from the aircraft, and stay on scene. Sheriff will meet you.' },
      { from: 'UAS-01',     role: 'AIRFRAME TELEM', side: 'telem', t: 'T+00:01:22', msg: 'Mode AUTO-LAND · descent 2 m/s · alt 98 m → 0 m · ETA 49s.' },
    ],
    logLines: [
      { t: 'T+00:01:18', sys: 'HAIL-RX',    type: 'ok',   msg: 'Pilot keyed mic · acknowledgment received · recorded to CoC bundle' },
      { t: 'T+00:01:19', sys: 'UAS-01',     type: 'info', msg: 'Mode change · AUTO-LAND · descent 2 m/s · touchdown ETA 49s' },
      { t: 'T+00:01:21', sys: 'DXD-AIR-01', type: 'info', msg: 'Holding overwatch · EO tracking descent · will RTB on touchdown' },
    ],
  },
  {
    step: 9, t: 'T+00:02:07', label: 'TOUCHDOWN · LE ON SCENE',
    title: 'Rogue on ground · operator detained',
    caption: 'UAS-01 touches down at 37.3876°N 77.3724°W. Sheriff Patrol-1 arrives 22 seconds later; operator is cooperative, detained pending charging decision by the Commonwealth\'s Attorney. DXD-AIR-01 RTB. C2 seals the evidence bundle — video, audio, telemetry, DF, federation receipts — for prosecution and NERC CIP-008 reporting.',
    alertLevel: 'resolved',
    droneT: 1.00,
    interceptT: 1.00,
    interceptShown: true,
    pilotShown: true,
    sensorsActive: ['ch-rf-01','ch-rf-02','ch-rad-01','ch-eo-02','ch-df-01','ch-df-02','ch-c2-01'],
    sensorsAlert: [],
    channelsFired: ['fbi','cisa','faa','tsoc','vafc','vsp','veoc','ccso','cc911','dsoc','eisac','pjm'],
    showResponse: { sheriff: true, dxd: true },
    interceptActive: false,
    commsShown: true,
    comms: [
      { from: 'CCSO-1', role: 'CHESTERFIELD SHERIFF', side: 'le', t: 'T+00:02:07', msg: 'On scene Dutch Gap boat launch · subject cooperative · aircraft secured · starting interview.' },
      { from: 'DXD-AIR-01', role: 'DXD OPERATOR', side: 'ops', t: 'T+00:02:09', msg: 'RTB · mission recorder sealed · handing scene to CCSO and FBI-RIC.' },
    ],
    logLines: [
      { t: 'T+00:02:07', sys: 'CCSO-1',     type: 'ok',   msg: 'On scene · operator detained · no resistance · UAS-01 secured' },
      { t: 'T+00:02:12', sys: 'CoC',        type: 'ok',   msg: 'Evidence bundle sealed · INC-2026-CHE-0173 · SHA-256 committed' },
      { t: 'T+00:02:15', sys: 'DXD-AEGIS',  type: 'ok',   msg: 'Incident closed on airspace · NERC CIP-008 report staged · no damage to assets · watch resumes nominal' },
    ],
  },
];

// Drone flight path — polyline of [lng, lat] points, relative to Chesterfield.
// Tight path: drone enters from NW edge of the tight zoom frame, crosses the
// sensor perimeter, orbits the 230kV switchyard, then egresses back NW.
// Path is scaled so the full polyline fits in a ~0.8km frame around the site
// center — you see the drone visibly fly into the sensor network.
(function(){
  const cx = -77.3821, cy = 37.3832;
  // dx/dy offsets in degrees (0.0045° ≈ 500m at this latitude)
  const pts = [
    [-0.0055,  0.0045],  // T=0.00  · edge of tight frame, NW
    [-0.0045,  0.0037],  // T=0.08  · still outside fence
    [-0.0035,  0.0030],  // T=0.17  · crossing outer RF/DF cone
    [-0.0025,  0.0022],  // T=0.25  · entering perimeter, trips radar
    [-0.0015,  0.0014],  // T=0.33  · inside fence, EO locks
    [-0.0005,  0.0008],  // T=0.42  · over switchyard N edge
    [ 0.0005,  0.0002],  // T=0.50  · dead over XFMR row (reconnaissance loop)
    [ 0.0014, -0.0003],  // T=0.58  · orbiting E
    [ 0.0018, -0.0010],  // T=0.67  · orbit S
    [ 0.0010, -0.0014],  // T=0.75  · SW corner of yard
    [-0.0005, -0.0010],  // T=0.83  · starting egress
    [-0.0022,  0.0000],  // T=0.92  · crossing fence outbound
    [-0.0040,  0.0018],  // T=0.96  · leaving frame NW
    [-0.0060,  0.0040],  // T=1.00  · off-frame (egress vector 312°)
  ];
  window.SCENARIO_DRONE_PATH = pts.map(p => [cx + p[0], cy + p[1]]);
  // Interceptor drone path — launches from the control house rooftop
  // cradle on-site, climbs, and pursues the rogue along an offset trail.
  // Points align with the rogue's mid/late path (roughly steps 6-9).
  const ix = [
    [ 0.0000,  0.0000],  // T=0.00 · launch pad on control house roof
    [ 0.0010,  0.0005],  // T=0.14 · climb + vector to intercept
    [ 0.0020,  0.0010],  // T=0.28 · accelerating
    [ 0.0028,  0.0014],  // T=0.43 · converging with rogue
    [ 0.0022, -0.0002],  // T=0.55 · merged — 40m trail behind rogue at orbit
    [ 0.0006, -0.0012],  // T=0.68 · trailing rogue SW
    [-0.0010, -0.0008],  // T=0.80 · trailing during hail
    [-0.0018,  0.0004],  // T=0.90 · escorting descent
    [-0.0008,  0.0008],  // T=0.96 · overwatch on touchdown
    [ 0.0000,  0.0000],  // T=1.00 · RTB to launch cradle
  ];
  window.SCENARIO_INTERCEPT_PATH = ix.map(p => [cx + p[0], cy + p[1]]);
  window.SCENARIO_INTERCEPT_LAUNCH = [cx, cy]; // rooftop cradle
  // Pilot location — across the James River at Dutch Gap boat launch
  window.SCENARIO_PILOT = [-77.3724, 37.3876];
  // Sheriff staging origin (CCSO · Courts & Jail complex near Rt 10)
  window.SCENARIO_SHERIFF_START = [-77.4048, 37.3770];
})();

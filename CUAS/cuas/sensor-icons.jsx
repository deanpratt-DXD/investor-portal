// Sensor icons — flat, bold, legible at small sizes.
// Designed to read as real equipment silhouettes at 16-24px.
// All use solid fills where possible + a small stroke for definition.

function SensorIcon({ type, size = 22, color = 'currentColor' }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: 1.4,
    strokeLinecap: 'round', strokeLinejoin: 'round'
  };
  const filled = { fill: color, stroke: 'none' };

  switch (type) {
    case 'rf': {
      // RF panel antenna — vertical rect (panel) + emission waves
      return (
        <svg {...p}>
          {/* Mast */}
          <rect x="11" y="3" width="2" height="18" {...filled}/>
          {/* Panel */}
          <rect x="9" y="7" width="6" height="8" rx="1" {...filled}/>
          {/* Right waves */}
          <path d="M 17,9 Q 19,12 17,15"/>
          <path d="M 20,7 Q 23,12 20,17" opacity="0.6"/>
          {/* Left waves */}
          <path d="M 7,9 Q 5,12 7,15"/>
          <path d="M 4,7 Q 1,12 4,17" opacity="0.6"/>
        </svg>
      );
    }
    case 'df': {
      // Direction finder — compass rose with bearing arrow
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" strokeWidth="1.6"/>
          <circle cx="12" cy="12" r="4" opacity="0.4"/>
          {/* Tick marks at cardinal */}
          <line x1="12" y1="4" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="20"/>
          <line x1="4" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="20" y2="12"/>
          {/* Bearing arrow NE */}
          <path d="M 12,12 L 17.5,6.5" strokeWidth="2"/>
          <path d="M 17.5,6.5 L 15,7 L 17,9 Z" {...filled}/>
          <circle cx="12" cy="12" r="1.4" {...filled}/>
        </svg>
      );
    }
    case 'radar': {
      // AESA radar — flat face-on dish silhouette, chevron "beam" sweeping
      return (
        <svg {...p}>
          {/* Pedestal */}
          <rect x="10" y="17" width="4" height="4" {...filled}/>
          <rect x="8" y="20" width="8" height="1.5" {...filled}/>
          {/* Flat panel radar face */}
          <rect x="4" y="5" width="16" height="10" rx="0.5" {...filled}/>
          {/* Grid on face */}
          <line x1="8" y1="5" x2="8" y2="15" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"/>
          <line x1="12" y1="5" x2="12" y2="15" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"/>
          <line x1="16" y1="5" x2="16" y2="15" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"/>
          <line x1="4" y1="10" x2="20" y2="10" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"/>
        </svg>
      );
    }
    case 'eoir': {
      // EO/IR PTZ camera — body + big lens
      return (
        <svg {...p}>
          {/* Yoke */}
          <rect x="11" y="19" width="2" height="3" {...filled}/>
          <rect x="8" y="21" width="8" height="1.5" {...filled}/>
          {/* Camera body */}
          <rect x="3" y="7" width="14" height="10" rx="1" {...filled}/>
          {/* Lens barrel */}
          <rect x="17" y="9" width="4" height="6" {...filled}/>
          {/* Lens glass */}
          <circle cx="19" cy="12" r="1.8" fill="rgba(0,0,0,0.6)"/>
          {/* Detail on body */}
          <circle cx="6" cy="10" r="0.8" fill="rgba(0,0,0,0.5)"/>
          <rect x="5" y="13" width="8" height="1.5" fill="rgba(0,0,0,0.4)"/>
        </svg>
      );
    }
    case 'acoustic': {
      // Microphone array — hex of dots
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" strokeWidth="1.4"/>
          <circle cx="12" cy="12" r="5.5" opacity="0.3"/>
          {/* Outer ring mics */}
          {[0,60,120,180,240,300].map((deg,i) => {
            const rad = (deg-90)*Math.PI/180;
            const x = 12 + Math.cos(rad)*6.5;
            const y = 12 + Math.sin(rad)*6.5;
            return <circle key={i} cx={x} cy={y} r="1.3" {...filled}/>;
          })}
          <circle cx="12" cy="12" r="1.4" {...filled}/>
        </svg>
      );
    }
    case 'pids': {
      // Ground radar — dome/hemisphere on post with fan beam
      return (
        <svg {...p}>
          {/* Post */}
          <rect x="11" y="15" width="2" height="7" {...filled}/>
          <rect x="8" y="21" width="8" height="1.5" {...filled}/>
          {/* Dome */}
          <path d="M 4,15 A 8,8 0 0 1 20,15 Z" {...filled}/>
          {/* Detection fan */}
          <path d="M 2,3 L 12,15 L 22,3" fill="none" stroke={color} strokeWidth="1"
                strokeDasharray="2 2" opacity="0.55"/>
        </svg>
      );
    }
    case 'c2': {
      // C2 — monitor / display with target reticle
      return (
        <svg {...p}>
          {/* Monitor */}
          <rect x="2" y="3" width="20" height="14" rx="1" {...filled}/>
          {/* Screen recess */}
          <rect x="4" y="5" width="16" height="10" rx="0.5" fill="rgba(0,0,0,0.75)"/>
          {/* Reticle crosshair */}
          <line x1="12" y1="7" x2="12" y2="13" stroke={color} strokeWidth="0.8"/>
          <line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth="0.8"/>
          <circle cx="12" cy="10" r="2" fill="none" stroke={color} strokeWidth="0.8"/>
          {/* Stand */}
          <rect x="10.5" y="17" width="3" height="2" {...filled}/>
          <rect x="7" y="19" width="10" height="1.5" {...filled}/>
        </svg>
      );
    }
    case 'daas': {
      // Quadcopter — top-down, X-frame with rotor discs
      return (
        <svg {...p}>
          {/* Arms */}
          <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.2"/>
          <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.2"/>
          {/* Rotors */}
          {[[6,6],[18,6],[6,18],[18,18]].map(([x,y],i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3" {...filled}/>
              <circle cx={x} cy={y} r="1.5" fill="rgba(0,0,0,0.6)"/>
            </g>
          ))}
          {/* Body */}
          <rect x="9" y="9" width="6" height="6" rx="1" {...filled}/>
          <circle cx="12" cy="12" r="1.2" fill="rgba(0,0,0,0.7)"/>
        </svg>
      );
    }
    case 'mit': {
      // Mitigation — shield with signal-block bars
      return (
        <svg {...p}>
          <path d="M 12,2 L 20,5 V 12 C 20,17 16.5,21 12,22 C 7.5,21 4,17 4,12 V 5 Z" {...filled}/>
          {/* Signal-block hatching inside shield */}
          <line x1="8" y1="9" x2="16" y2="17" stroke="rgba(0,0,0,0.55)" strokeWidth="1.6"/>
          <line x1="16" y1="9" x2="8" y2="17" stroke="rgba(0,0,0,0.55)" strokeWidth="1.6"/>
        </svg>
      );
    }
    default:
      return <svg {...p}><circle cx="12" cy="12" r="5" {...filled}/></svg>;
  }
}

window.SensorIcon = SensorIcon;

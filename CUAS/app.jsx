// Main app — ties all scenes together with scroll tracking, tweaks panel, edit mode.

function App() {
  const [currentScene, setCurrentScene] = useState(0);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  // Which tweak sections are open (collapsed by default except Sensor Types)
  const [tweakSect, setTweakSect] = useState({ sensors: true, display: false, scenario: false });
  const [tweaks, setTweaks] = useState({
    dayMode: true,
    showLabels: true,
    showCoverage: true,
    scenarioSpeed: 1,
    enabledSensors: {
      rf: true, df: true, radar: true, eoir: true,
      acoustic: true, pids: true, c2: true, daas: true, mit: true
    }
  });

  const sceneRefs = useRef([]);

  const scenes = [
    { id: 'hero', label: 'Title' },
    { id: 'context', label: 'Threat' },
    { id: 'deployment', label: 'Sites' },
    { id: 'scenario', label: 'Scenario' },
    { id: 'credentials', label: 'DXD' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'sources', label: 'Sources' },
  ];

  useEffect(() => {
    const onScroll = () => {
      const mid = window.scrollY + window.innerHeight / 2;
      let closest = 0;
      sceneRefs.current.forEach((el, i) => {
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= mid) closest = i;
      });
      setCurrentScene(closest);

      // Manual sticky: for every .scene-sticky, toggle is-sticky/is-bottom
      document.querySelectorAll('.scene-sticky').forEach(s => {
        const rect = s.getBoundingClientRect();
        const h = s.offsetHeight;
        const vh = window.innerHeight;
        if (rect.top <= 0 && rect.top + h > vh) {
          s.classList.add('is-sticky');
          s.classList.remove('is-bottom');
        } else if (rect.top + h <= vh) {
          s.classList.remove('is-sticky');
          s.classList.add('is-bottom');
        } else {
          s.classList.remove('is-sticky', 'is-bottom');
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Edit-mode wiring
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || !e.data.type) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (k, v) => setTweaks(t => ({ ...t, [k]: v }));
  const toggleSensor = (k) => setTweaks(t => ({
    ...t,
    enabledSensors: { ...t.enabledSensors, [k]: !t.enabledSensors[k] }
  }));

  const scrollToScene = (i) => {
    const el = sceneRefs.current[i];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
  };

  return (
    <>
      {/* Top chrome */}
      <header className="chrome-header">
        <div className="left">
          <img src="assets/dxd-wordmark-white.png" alt="Deus X Defense" className="logo"/>
          <div className="classifier">UNCLAS // FOUO</div>
        </div>
        <div className="right">
          <span className="mono">SCENE {String(currentScene+1).padStart(2,'0')}/{String(scenes.length).padStart(2,'0')}</span>
          <button className={`tweaks-toggle ${tweaksOpen ? 'open' : ''}`}
                  onClick={() => setTweaksOpen(v => !v)}
                  title="Deployment tweaks">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"/>
            </svg>
            <span>TWEAKS</span>
          </button>
        </div>
      </header>

      {/* Side rail */}
      <nav className="scene-rail">
        {scenes.map((s, i) => (
          <div key={s.id} className={`dot ${i === currentScene ? 'active' : ''}`}
               data-label={s.label}
               onClick={() => scrollToScene(i)}/>
        ))}
      </nav>

      {/* Scenes */}
      <main ref={el => sceneRefs.current[0] = el}><HeroScene/></main>
      <main ref={el => sceneRefs.current[1] = el}><ContextScene/></main>
      <DeploymentScene refCb={el => sceneRefs.current[2] = el} tweaks={tweaks} setTweaks={setTweaks}/>
      <ScenarioScene refCb={el => sceneRefs.current[3] = el} tweaks={tweaks}/>
      <main ref={el => sceneRefs.current[4] = el}><CredentialsScene/></main>
      <main ref={el => sceneRefs.current[5] = el}><ComplianceScene/></main>
      <main ref={el => sceneRefs.current[6] = el}><SourcesScene/></main>

      {/* Tweaks dropdown (anchored to header button) */}
      {tweaksOpen && (
        <div className="tweaks-panel tweaks-dropdown">
          <div className="head">
            <h5>Tweaks · Deployment</h5>
            <span className="x" onClick={() => setTweaksOpen(false)}>✕</span>
          </div>

          <div className={`sect ${tweakSect.sensors ? 'open' : ''}`}>
            <h6 onClick={() => setTweakSect(s => ({...s, sensors: !s.sensors}))}>
              <span>Sensor Types</span>
              <span className="chev">{tweakSect.sensors ? '−' : '+'}</span>
            </h6>
            {tweakSect.sensors && (
              <div className="sect-body">
                {['rf','df','radar','eoir','acoustic','pids','c2','daas','mit'].map(k => (
                  <label key={k}>
                    <span>{window.SENSORS[k].short} · {window.SENSORS[k].name}</span>
                    <input type="checkbox"
                           checked={tweaks.enabledSensors[k]}
                           onChange={() => toggleSensor(k)}/>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={`sect ${tweakSect.display ? 'open' : ''}`}>
            <h6 onClick={() => setTweakSect(s => ({...s, display: !s.display}))}>
              <span>Display</span>
              <span className="chev">{tweakSect.display ? '−' : '+'}</span>
            </h6>
            {tweakSect.display && (
              <div className="sect-body">
                <label>
                  <span>Coverage rings</span>
                  <input type="checkbox"
                         checked={tweaks.showCoverage}
                         onChange={e => setTweak('showCoverage', e.target.checked)}/>
                </label>
                <label>
                  <span>Sensor labels</span>
                  <input type="checkbox"
                         checked={tweaks.showLabels}
                         onChange={e => setTweak('showLabels', e.target.checked)}/>
                </label>
                <label>
                  <span>Day mode (EO) ⇄ Night (IR)</span>
                  <input type="checkbox"
                         checked={tweaks.dayMode}
                         onChange={e => setTweak('dayMode', e.target.checked)}/>
                </label>
              </div>
            )}
          </div>

          <div className="sect" style={{borderBottom: 0}}>
            <div className="sect-body">
              <button onClick={() => setTweaks({
                dayMode: true, showLabels: true, showCoverage: true, scenarioSpeed: 1,
                enabledSensors: { rf: true, df: true, radar: true, eoir: true,
                  acoustic: true, pids: true, c2: true, daas: true, mit: true }
              })} style={{
                background: 'transparent', border: '1px solid var(--dxd-red)',
                color: 'var(--dxd-red)', padding: '6px 12px', fontFamily: 'var(--font-display)',
                fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
                width: '100%'
              }}>Reset all</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);

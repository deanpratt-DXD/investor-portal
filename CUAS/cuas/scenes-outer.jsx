// Scenario scene, Credentials, Compliance, Sources, CTA
// (DeploymentScene moved to scenes-deployment.jsx)

function ScenarioScene({ tweaks, refCb }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [entries, setEntries] = useState([]);

  // Scenario event script
  const script = useMemo(() => [
    { t: 'T+00:00', sys: 'RF-01',   type: 'warn', msg: 'RF emission detected · DJI OcuSync 2 · 2.4 GHz' },
    { t: 'T+00:01', sys: 'RF-02',   type: 'warn', msg: 'Signal corroborated · bearing 312° / 85° confidence' },
    { t: 'T+00:03', sys: 'DF-FUSION', type: 'info', msg: 'Operator TDOA fix · 1.8 km NNW · ±22 m' },
    { t: 'T+00:06', sys: 'RAD-01',  type: 'warn', msg: 'Non-cooperative track acquired · RCS 0.02 m²' },
    { t: 'T+00:08', sys: 'C2',      type: 'info', msg: 'Track fusion complete · UAS-01 · DJI M300 RTK' },
    { t: 'T+00:10', sys: 'EO-01',   type: 'info', msg: 'PTZ slew-to-cue · visual lock · payload = camera' },
    { t: 'T+00:12', sys: 'C2',      type: 'warn', msg: 'Classification: RECON · prior library hit (3rd event)' },
    { t: 'T+00:18', sys: 'SOC',     type: 'info', msg: 'Dispatch · County Sheriff to operator fix' },
    { t: 'T+00:22', sys: 'DAAS-01', type: 'info', msg: 'Response UAS launched · escort intercept vector' },
    { t: 'T+00:45', sys: 'SOC',     type: 'ok',   msg: 'PD confirms operator at GPS · subject detained' },
    { t: 'T+00:51', sys: 'C2',      type: 'ok',   msg: 'Evidence bundle sealed · NIST 800-171 chain-of-custody' },
    { t: 'T+00:53', sys: 'OWNER-SOC', type: 'ok',  msg: 'Asset-Owner SOC notified · sector incident report staged' },
  ], []);

  useEffect(() => {
    if (!playing) return;
    const speed = tweaks.scenarioSpeed || 1;
    const iv = setInterval(() => {
      setStep(prev => {
        if (prev >= script.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200 / speed);
    return () => clearInterval(iv);
  }, [playing, tweaks.scenarioSpeed, script.length]);

  useEffect(() => {
    setEntries(script.slice(0, step + 1));
    // auto-scroll log
    const log = document.querySelector('.scenario-log .entries');
    if (log) log.scrollTop = log.scrollHeight;
  }, [step, script]);

  const droneStep = Math.min(Math.floor(step / 2), 6);

  return (
    <section ref={refCb} className="scene-sticky" data-screen-label="06 Live Scenario" style={{height: '350vh'}}>
      <div className="sticky-inner">
        <div className="scene-label">
          <span className="red">SCENE 06</span> · Live Threat Scenario · Site Alpha
        </div>

        <Substation3DScene
          dayMode={tweaks.dayMode}
          showLabels={false}
          showCoverage={true}
          enabledSensors={tweaks.enabledSensors}
          scenarioMode={true}
          scenarioStep={droneStep}
        />

        {/* Threat card */}
        <div className="threat-card">
          <div className="head">
            <div className="lbl">▸ Active Track</div>
            <div className="id">UAS-01</div>
          </div>
          <div className="row"><span className="k">Class</span><span className="v red">GROUP 1 — RECON</span></div>
          <div className="row"><span className="k">Platform</span><span className="v">DJI M300 RTK</span></div>
          <div className="row"><span className="k">Payload</span><span className="v">H20T Camera</span></div>
          <div className="row"><span className="k">Altitude</span><span className="v">120 m AGL</span></div>
          <div className="row"><span className="k">Speed</span><span className="v">11 m/s SE</span></div>
          <div className="row"><span className="k">Operator</span><span className="v red">1.8 km NNW (fixed)</span></div>
          <div className="row"><span className="k">Priors</span><span className="v">2 matches (2025-Q4)</span></div>
          <div className="row"><span className="k">Remote ID</span><span className="v">1581F-... (spoofed)</span></div>
        </div>

        {/* Scenario log */}
        <div className="scenario-log">
          <h5>
            <span>Incident Log · INC-2026-0047</span>
            <span className="state">{playing ? 'LIVE' : 'RESOLVED'}</span>
          </h5>
          <div className="entries">
            {entries.map((e, i) => (
              <div key={i} className={`entry ${e.type}`}>
                <span className="t">{e.t}</span>
                <span className="sys">{e.sys}</span>
                <span className="msg">{e.msg}</span>
              </div>
            ))}
          </div>
          <div style={{padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dxd-silver)',
            textTransform: 'uppercase', letterSpacing: '0.12em'}}>
            <button onClick={() => { setStep(0); setPlaying(true); setEntries([]); }}
                    style={{background:'transparent', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--fg-1)', padding: '4px 10px', fontFamily: 'inherit', fontSize: 10,
                    letterSpacing: '0.14em', cursor: 'pointer'}}>▸ Replay</button>
            <span style={{marginLeft:'auto'}}>Step {step+1}/{script.length}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CredentialsScene() {
  return (
    <section className="scene" data-screen-label="07 Credentials" style={{padding: '80px 0'}}>
      <div className="cred-wrap">
        <div className="eyebrow">The Deus X Difference</div>
        <h2 className="display" style={{marginTop: 16, maxWidth: '20ch'}}>
          Good people. Real technology. One partner.
        </h2>
        <p className="lead" style={{marginTop: 24, maxWidth: '65ch'}}>
          DXD is not a product reseller. We design, deploy, and operate the full
          counter-UAS stack — every node, every shift, every incident. You get a
          unified partner accountable to outcomes, not invoices.
        </p>

        <div className="cred-grid">
          <div className="card">
            <div className="n"><span className="red">24</span>/7</div>
            <hr/>
            <div className="l">Staffed SOC</div>
            <div className="p">Two-analyst minimum per shift, including a cleared Tactical Lead. US-persons only, backgrounded under DoD TS protocol.</div>
          </div>
          <div className="card">
            <div className="n">1,300<span className="red">+</span></div>
            <hr/>
            <div className="l">Vetted Operators</div>
            <div className="p">Armed and unarmed professional personnel, including off-duty law-enforcement and cleared veterans. Judgment at the point of risk.</div>
          </div>
          <div className="card">
            <div className="n">700<span className="red">+</span></div>
            <hr/>
            <div className="l">Active DaaS Assets</div>
            <div className="p">NDAA-compliant response drones under Part 107, 108, and BVLOS waivers. Launch-in-60, escort-to-land, evidence recorded.</div>
          </div>
        </div>

        <div className="pillar-grid">
          <div className="pillar red">
            <img src="assets/icons/drone-icon.png" alt="DaaS"/>
            <h4>Drone-as-a-Service</h4>
            <p>On-demand aerial response, autonomous networks, live C3 integration — NDAA and Non-NDAA program architecture, already running for public-safety and industrial customers.</p>
          </div>
          <div className="pillar red">
            <img src="assets/icons/eye-icon.png" alt="Monitoring"/>
            <h4>Remote Monitoring &amp; Response</h4>
            <p>24/7 AI-assisted detection fused into a unified "single pane of glass." Every sensor, every site, every operator — one view, one record, one accountable team.</p>
          </div>
          <div className="pillar red">
            <img src="assets/icons/security-officer-icon.png" alt="Personnel"/>
            <h4>Manned Guarding</h4>
            <p>Vetted armed/unarmed personnel on the ground. Because technology without judgment isn't security — it's surveillance. The two run together or not at all.</p>
          </div>
          <div className="pillar red">
            <img src="assets/icons/diagram-icon.png" alt="Agency Orchestration"/>
            <h4>Agency Orchestration</h4>
            <p>DXD orchestrates integrations and automations to federal, state, and local agencies — FBI, CISA, FAA, state fusion centers, state police, county sheriffs, E911 PSAPs — for rapid response and shared situational awareness on every confirmed event.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComplianceScene() {
  return (
    <section className="scene" data-screen-label="08 Compliance" style={{padding: '80px 0'}}>
      <div className="comp-wrap">
        <div className="eyebrow">Engineered to Pass Audit</div>
        <h2 className="display" style={{marginTop: 16, maxWidth: '22ch'}}>
          Compliant at first install. Not retrofitted later.
        </h2>
        <p className="lead" style={{marginTop: 24, maxWidth: '65ch'}}>
          Counter-UAS at a utility touches FAA, FCC, NERC, DHS, and federal anti-drone
          statutes. DXD's system is built against the controls from the first line of
          code — because a retrofit under audit is a program in crisis.
        </p>

        <div className="comp-grid">
          <div className="item">
            <div className="badge">FAA<br/>§2209</div>
            <div>
              <h4>Critical Infrastructure Airspace</h4>
              <p>Covered asset owners qualify for FAA Section 2209 restricted-airspace designations over Tier-1 sites. DXD supports the petition, data, and ongoing enforcement coordination with FSDO.</p>
            </div>
          </div>
          <div className="item">
            <div className="badge">NDAA<br/>§848</div>
            <div>
              <h4>NDAA / Blue UAS</h4>
              <p>Every DXD airframe and radio is Section 848-compliant. No covered-entity supply chain. Component-level BOM traceability on request.</p>
            </div>
          </div>
          <div className="item">
            <div className="badge">NERC<br/>CIP</div>
            <div>
              <h4>CIP-008 / CIP-014</h4>
              <p>Evidence bundles, chain-of-custody, and incident reports shaped to NERC CIP-008 (incident reporting) and CIP-014 (physical security) from the outset.</p>
            </div>
          </div>
          <div className="item">
            <div className="badge">FedRAMP<br/>MOD</div>
            <div>
              <h4>FedRAMP Moderate Hosting</h4>
              <p>Single pane of glass hosted in AWS GovCloud under FedRAMP Moderate. Postgres Row-Level Security per site, per classification. NIST 800-53 controls mapped.</p>
            </div>
          </div>
          <div className="item">
            <div className="badge">6 USC<br/>§124n</div>
            <div>
              <h4>Mitigation Authority</h4>
              <p>Kinetic and non-kinetic mitigation is federally-restricted. DXD deploys detect-and-track by default; mitigation is layered under a federal sponsor or owner-of-airspace model as authorized.</p>
            </div>
          </div>
          <div className="item">
            <div className="badge">NIST<br/>800-171</div>
            <div>
              <h4>Data Residency &amp; CUI Handling</h4>
              <p>US-persons, US-soil, US-network. All telemetry encrypted in transit (TLS 1.3) and at rest (AES-256-GCM). 7-year cold retention for prosecution support.</p>
            </div>
          </div>
        </div>

        <div className="cta-banner">
          <div>
            <div className="eyebrow">The Ask</div>
            <h3 style={{marginTop: 16}}>
              Authorize a <span className="red">90-day</span> pilot at Site Alpha.
            </h3>
            <p>One site. Full sensor stack. DXD-staffed SOC. Outcomes measured against a baseline incident response gap asset owners already know exists. If it works, we scale to Site Bravo and Site Charlie in Q3.</p>
          </div>
          <div className="meta">
            <span className="k">Deus X Defense</span>
            <span className="v">WE'RE HERE. WE KNOW. WE'RE READY.</span>
            <span className="k" style={{marginTop: 20}}>Point of contact</span>
            <span className="v" style={{fontSize: 13, letterSpacing: '0.08em'}}>CI PROTECTION · DXD</span>
            <span className="k" style={{marginTop: 20}}>Doc · Rev</span>
            <span className="v" style={{fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em'}}>DXD-CUAS-CI-2026-04 · r1</span>
          </div>
        </div>
      </div>

      <div className="end-stamp" style={{marginTop: 80}}>
        <img src="assets/dxd-wordmark-white.png" alt="Deus X Defense"/>
        <span>© 2026 Deus X Defense · Unclassified // FOUO · Prepared for Asset-Owner CI Protection</span>
      </div>
    </section>
  );
}

window.ScenarioScene = ScenarioScene;
window.CredentialsScene = CredentialsScene;
window.ComplianceScene = ComplianceScene;

// ------------------------------------------------------------
// Sources & citations scene — last in the deck.
function SourcesScene() {
  const [selected, setSelected] = useState(null);
  // Group sources by thematic bucket
  const groups = [
    { title: 'Threat intelligence & incident record', ids: ['dhs-2024','ferc-2023','moore-nc','langley-2023','gao-24'] },
    { title: 'Reliability & incident-reporting standards', ids: ['nerc-cip-014','nerc-cip-008'] },
    { title: 'Airspace, Remote-ID & §2209', ids: ['faa-2209','faa-partB'] },
    { title: 'Federal mitigation authority', ids: ['6usc124n','10usc130i','doj-2020'] },
    { title: 'Supply chain · NDAA §848 / Blue UAS', ids: ['ndaa-848','blueuas'] },
    { title: 'Data & cloud compliance', ids: ['fedramp','nist800171'] },
    { title: 'Sensor product class references (non-endorsement)', ids: ['dedrone','echodyne','flir','spotter','skydio','dfend','crfs'] },
  ];
  const byId = Object.fromEntries(window.SOURCES.map(s => [s.id, s]));

  return (
    <section className="scene" data-screen-label="09 Sources" style={{padding: '120px 0 80px', alignItems: 'flex-start', display: 'block', minHeight: 'auto'}}>
      <div className="sources-wrap">
        <div className="eyebrow">Index · Sources &amp; Citations</div>
        <h2 className="display" style={{marginTop: 16, maxWidth: '22ch'}}>
          Every number traces to a public source.
        </h2>
        <p className="lead" style={{marginTop: 24, maxWidth: '70ch'}}>
          DXD's briefings are built on the public record — federal statute, reliability standards,
          regulatory filings, and vendor datasheets. Nothing in this deck is invented. Incident
          figures, threat statistics, and performance specs all resolve to a numbered reference below.
          Representative &amp; illustrative figures are marked as such in-scene.
        </p>

        <div className="sources-grid">
          {groups.map((g, gi) => (
            <div key={gi} className="src-group">
              <h4>{g.title}</h4>
              <div className="src-list">
                {g.ids.map((id, i) => {
                  const s = byId[id]; if (!s) return null;
                  return (
                    <div key={id} className="src-item"
                         onClick={() => setSelected(selected === id ? null : id)}>
                      <div className="src-num">{String(window.SOURCES.findIndex(x=>x.id===id)+1).padStart(2,'0')}</div>
                      <div className="src-body">
                        <div className="src-label">{s.label}</div>
                        <a className="src-url" href={s.url} target="_blank" rel="noopener noreferrer"
                           onClick={e => e.stopPropagation()}>{s.url}</a>
                        {selected === id && (
                          <div className="src-supports">
                            <div className="lbl">Supports claims ·</div>
                            <ul>
                              {s.supports.map((sp, j) => <li key={j}>{sp}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="src-footer">
          <div>
            <div className="eyebrow">Note on representative figures</div>
            <p style={{maxWidth: '60ch', marginTop: 10, fontSize: 13, lineHeight: 1.65, color: 'var(--dxd-silver)'}}>
              Per-site incident counts, specific GPS fixes in the scenario walk-through, and the
              UAS-01 "prior library" references are <em>illustrative reconstructions</em> for the
              purposes of this briefing. Detection-range and classification numbers are taken from
              publicly-published datasheets of the referenced sensor product class; actual
              performance varies with terrain, RF environment, and integration.
            </p>
          </div>
          <div className="src-stamp">
            <div className="eyebrow">Doc · Rev</div>
            <div className="stamp-v">DXD-CUAS-CI-2026-04 · r1</div>
            <div className="eyebrow" style={{marginTop: 14}}>Unclassified // FOUO</div>
            <div className="stamp-v" style={{color: 'var(--dxd-red)'}}>Prepared for Asset-Owner CI Protection</div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.SourcesScene = SourcesScene;

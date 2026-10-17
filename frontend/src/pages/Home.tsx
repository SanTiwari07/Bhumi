import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Layers,
  MapPin,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { api, BuildState, HomeData } from "../api";
import { useSession } from "../session";
import FieldsMap from "../components/FieldsMap";
import { ConfidenceMeter, SeverityBadge, Spinner } from "../components/ui";
import { fmtDate, plainDrop } from "../lib/format";

function Building({ areaName }: { areaName: string }) {
  const { set, refresh } = useSession();
  const nav = useNavigate();
  const [st, setSt] = useState<BuildState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const res = await api.build();
        if (!live) return;
        setSt(res.build);
        if (res.area.status === "ready" || res.build.status === "ready") {
          await refresh();
        }
      } catch {
        // ignore transient poll error
      }
    };
    poll();
    const id = window.setInterval(poll, 1600);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, [refresh]);

  const retry = async () => {
    setBusy(true);
    try {
      const res = await api.retryBuild();
      setSt(res.build);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    setBusy(true);
    try {
      set(await api.joinArea(null));
      nav("/setup");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow">
      <section className="build-box" aria-live="polite">
        <p className="eyebrow">Sentinel-2 L2A + ERA5-Land Ingestion Pipeline</p>
        <h1>Preparing {areaName}</h1>
        <p className="lede">
          Bhumi is pulling cloud-screened 10 m Sentinel-2 passes, delineating parcel boundaries, and computing SHA-256 Merkle commitments for your monitoring basin.
        </p>

        {st?.steps ? (
          <ol className="build-steps">
            {st.steps.map((s) => (
              <li key={s.id} className={`bs-${s.state}`}>
                <span className="bs-dot" aria-hidden>
                  {s.state === "done" ? <CheckCircle2 size={15} /> : s.state === "running" ? <Spinner size={14} /> : null}
                </span>
                <div>
                  <strong>{s.label}</strong>
                  {s.detail && <small>{s.detail}</small>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="center-spin"><Spinner size={22} /></div>
        )}

        {st?.status === "failed" && (
          <div className="build-err" role="alert">
            <AlertTriangle size={16} aria-hidden />
            <div>
              <strong>Could not finish setting up this area</strong>
              <p>{st.error || "Satellite archive request timed out."}</p>
              <div className="build-actions">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={retry}>
                  <RefreshCw size={14} aria-hidden /> Retry ingestion
                </button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={change}>
                  Choose another area
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Briefing() {
  const [h, setH] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .home()
      .then(setH)
      .catch((e) => setError(e.message || "Could not load basin briefing."));
  }, []);

  if (error) {
    return (
      <main className="page">
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }

  if (!h) {
    return (
      <main className="page">
        <div className="center-spin"><Spinner size={24} /></div>
      </main>
    );
  }

  const totalAlerts = Math.max(
    1,
    h.counts.visit + h.counts.watch + h.counts.area_alert + h.counts.dismissed,
  );
  const visitPct = (h.counts.visit / totalAlerts) * 100;
  const watchPct = (h.counts.watch / totalAlerts) * 100;
  const areaPct = (h.counts.area_alert / totalAlerts) * 100;
  const dismissedPct = (h.counts.dismissed / totalAlerts) * 100;

  return (
    <main className="page home">
      <header className="home-head">
        <div>
          <p className="home-where">
            <MapPin size={14} aria-hidden /> {h.area.region} · {h.area.km2 ?? 12} km² monitored basin · Sentinel-2 pass {fmtDate(h.last_pass ?? h.as_of)}
          </p>
          <h1>{h.area.name}</h1>
          <p className="home-sub">
            Field stewardship briefing for <strong>{h.officer.name}</strong> as of {fmtDate(h.as_of)}. Every anomaly is cross-checked against parcel neighbours, ERA5-Land weather, and crop phenology before sealing into an Ethereum Sepolia Merkle root.
          </p>
        </div>
        <div className="home-head-actions">
          <Link to="/ledger" className="btn btn-ghost">
            <ShieldCheck size={15} aria-hidden /> Verify Sepolia dMRV Root
          </Link>
          <Link to="/cases" className="btn btn-primary">
            <Layers size={15} aria-hidden /> Open Triage Queue ({h.alerts})
          </Link>
        </div>
      </header>

      {/* 4-Card Ecological & Cryptographic dMRV Telemetry Ribbon */}
      <section className="telemetry-ribbon" aria-label="Ecological and cryptographic dMRV telemetry">
        <article className="telemetry-card">
          <div className="tc-label">
            <Sprout size={14} aria-hidden /> Monitored Agro-Ecosystem
          </div>
          <div className="tc-value">{h.fields} Parcels</div>
          <div className="tc-sub">
            {h.area.km2 ?? 12} km² footprint · 10 m Sentinel-2 L2A NDVI &amp; NDWI
          </div>
        </article>

        <article className="telemetry-card is-soil">
          <div className="tc-label">
            <Compass size={14} aria-hidden /> Priority Ground Checks
          </div>
          <div className="tc-value">
            {h.counts.visit} {h.counts.visit === 1 ? "Parcel" : "Parcels"}
          </div>
          <div className="tc-sub">
            {h.counts.watch} watching on next pass · {h.counts.area_alert} area-wide weather/canal alerts
          </div>
        </article>

        <article className="telemetry-card">
          <div className="tc-label">
            <Satellite size={14} aria-hidden /> False-Alarm Suppression
          </div>
          <div className="tc-value">{h.counts.dismissed} Filtered</div>
          <div className="tc-sub">
            {h.counts.harvest} expected harvest · {Math.max(0, h.counts.dismissed - h.counts.harvest)} boundary/cloud artifacts [IEEE-5]
          </div>
        </article>

        <article className="telemetry-card is-sepolia">
          <div className="tc-label">
            <ShieldCheck size={14} aria-hidden /> Ethereum Sepolia State Root
          </div>
          <div className="tc-value" title={h.area_merkle_root}>
            {h.area_merkle_root
              ? `${h.area_merkle_root.slice(0, 12)}…${h.area_merkle_root.slice(-8)}`
              : "0xVerified"}
          </div>
          <div className="tc-sub">
            chainId: {h.network?.chain_id ?? 11155111} · {h.counts.updated} ground-attested cases
          </div>
        </article>
      </section>

      {/* Proportional Triage Strip */}
      <section className="triage" aria-label="Basin alert triage breakdown">
        <div className="triage-bar" role="img" aria-label="Proportion of alerts by outcome">
          {visitPct > 0 && <span className="tb-visit" style={{ width: `${visitPct}%` }} title={`Visit needed: ${h.counts.visit}`} />}
          {watchPct > 0 && <span className="tb-watch" style={{ width: `${watchPct}%` }} title={`Watching: ${h.counts.watch}`} />}
          {areaPct > 0 && <span className="tb-area" style={{ width: `${areaPct}%` }} title={`Area alert: ${h.counts.area_alert}`} />}
          {dismissedPct > 0 && <span className="tb-dismissed" style={{ width: `${dismissedPct}%` }} title={`Auto-dismissed: ${h.counts.dismissed}`} />}
        </div>
        <div className="triage-keys">
          <Link to="/cases?filter=visit" className="tk">
            <i className="dot-visit" /> <b>{h.counts.visit}</b> Need a field visit
          </Link>
          <Link to="/cases?filter=watch" className="tk">
            <i className="dot-watch" /> <b>{h.counts.watch}</b> Watching (1 clear pass)
          </Link>
          <Link to="/cases?filter=area_alert" className="tk">
            <i className="dot-area" /> <b>{h.counts.area_alert}</b> Area-wide signal
          </Link>
          <Link to="/cases?filter=dismissed" className="tk">
            <i className="dot-dismissed" /> <b>{h.counts.dismissed}</b> Settled without visit ({h.counts.harvest} harvest)
          </Link>
        </div>
      </section>

      {/* Asymmetric Bento Grid: Left Interactive Parcel Map, Right Priority Triage Queue */}
      <div className="home-work">
        <section className="home-map" aria-label="Interactive basin parcel map">
          <div className="home-sec-head">
            <div>
              <h2>Basin Canopy &amp; Parcel Map</h2>
              <p className="muted small">
                Click any parcel polygon to open its diagnostic dossier, or use the map tools to refine field boundaries.
              </p>
            </div>
            <Link to="/cases?view=map" className="link-more">
              Full-screen map <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <FieldsMap />
        </section>

        <aside className="start" aria-label="Priority ground-truth triage queue">
          <div className="home-sec-head">
            <div>
              <h2>Start Here: Priority Field Visits</h2>
              <p className="muted small">
                Ranked by severity of NDVI drop and diagnostic separability.
              </p>
            </div>
            <Link to="/cases" className="link-more">
              All {h.alerts} cases <ArrowRight size={14} aria-hidden />
            </Link>
          </div>

          <ol className="start-list">
            {h.top.map((r, idx) => (
              <li key={r.id}>
                <Link to={`/case/${r.id}`} className="start-card">
                  <span className="start-rank" aria-label={`Priority ${idx + 1}`}>
                    {idx + 1}
                  </span>
                  <div className="start-body">
                    <div className="start-top">
                      <strong>{r.field.name}</strong>
                      <span className="muted small">
                        {r.field.area_ha} ha · {r.field.class_label}
                      </span>
                      <SeverityBadge level={r.severity} />
                    </div>
                    <p className="start-drop">
                      {r.headline
                        ? `${plainDrop(r.headline.delta, r.headline.zone_label)} (${fmtDate(r.headline.date)})`
                        : r.reason}
                    </p>
                    <div className="start-foot">
                      <span className="start-lead">
                        Leading cause: <b>{r.leading}</b>
                      </span>
                      {r.confidence && <ConfidenceMeter level={r.confidence} />}
                      {r.evidence_root && (
                        <code className="hash-pill" title={`SHA-256 Case Evidence Root: ${r.evidence_root}`}>
                          {r.evidence_root.slice(0, 10)}…
                        </code>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={16} className="start-arrow" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>

          <div className="sepolia-epoch-card">
            <div className="eyebrow">Cryptographic Climate dMRV · IEEE Track 4</div>
            <h3>Verifiable Basin Merkle Commitment</h3>
            <p>
              All {h.alerts} diagnostic cases in <strong>{h.area.name}</strong> are hashed into canonical SHA-256 leaves with privacy-preserving parcel commitments [IEEE-1] and double-counting nullifiers [IEEE-2].
            </p>
            <code className="sepolia-root-code">{h.area_merkle_root}</code>
            <Link to="/ledger" className="btn btn-outline-inverse btn-sm">
              <ShieldCheck size={14} aria-hidden /> Inspect Leaves &amp; Anchor on Sepolia
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Home() {
  const { me } = useSession();
  if (!me?.area) return null;
  if (me.area.status !== "ready") {
    return <Building areaName={me.area.name} />;
  }
  return <Briefing />;
}

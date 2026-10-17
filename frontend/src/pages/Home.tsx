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
    <main className="page narrow building" aria-live="polite">
      <header className="build-head">
        <p className="eyebrow">Sentinel-2 L2A + ERA5-Land Ingestion Pipeline</p>
        <h1>Preparing {areaName}</h1>
        <p className="lede">
          Bhumi is pulling cloud-screened 10 m Sentinel-2 passes, delineating parcel boundaries, and computing SHA-256 Merkle commitments for your monitoring basin.
        </p>
      </header>

      {st?.steps ? (
        <ol className="bsteps">
          {st.steps.map((s) => (
            <li key={s.id} className={`bstep bstep-${s.state}`}>
              <span className="bstep-icon" aria-hidden>
                {s.state === "done" ? <CheckCircle2 size={15} /> : s.state === "running" ? <Spinner size={14} /> : s.state === "failed" ? <AlertTriangle size={13} /> : null}
              </span>
              <div className="bstep-body">
                <div className="bstep-head"><strong>{s.label}</strong></div>
                {s.detail && <p>{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="center-spin"><Spinner size={22} /></div>
      )}

      {st?.status === "failed" && (
        <div className="build-error" role="alert">
          <AlertTriangle size={16} aria-hidden />
          <div>
            <strong>Could not finish setting up this area</strong>
            <p>{st.error || "Satellite archive request timed out."}</p>
            <div className="row">
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

  // counts.dismissed excludes harvests; together they are every case settled without a visit
  const settled = h.counts.dismissed + h.counts.harvest;
  const segments = [
    { key: "visit", n: h.counts.visit, title: "Visit needed" },
    { key: "watch", n: h.counts.watch, title: "Watching" },
    { key: "area", n: h.counts.area_alert, title: "Area alert" },
    { key: "harvest", n: h.counts.harvest, title: "Expected harvest" },
    { key: "dismissed", n: h.counts.dismissed, title: "Auto-dismissed" },
  ].filter((s) => s.n > 0);

  return (
    <main className="page home">
      <header className="home-head">
        <div>
          <p className="home-where">
            <MapPin size={14} aria-hidden /> {h.area.region} · {h.area.km2 ?? 12} km² monitored basin · Sentinel-2 pass {fmtDate(h.last_pass ?? h.as_of)}
          </p>
          <h1>{h.area.name}</h1>
          <p className="lede">
            Field stewardship briefing for <strong className="h-quiet">{h.officer.name}</strong> as of {fmtDate(h.as_of)}. Every anomaly is cross-checked against parcel neighbours, ERA5-Land weather, and crop phenology before sealing into an Ethereum Sepolia Merkle root.
          </p>
        </div>
        <div className="home-head-actions">
          <Link to="/ledger" className="btn btn-outline btn-lg">
            <ShieldCheck size={15} aria-hidden /> Verify Sepolia dMRV Root
          </Link>
          <Link to="/cases" className="btn btn-primary btn-lg">
            <Layers size={15} aria-hidden /> Open Triage Queue ({h.alerts})
          </Link>
        </div>
      </header>

      {/* 4-Card Ecological & Cryptographic dMRV Telemetry Ribbon */}
      <section className="telemetry-ribbon" aria-label="Ecological and cryptographic dMRV telemetry">
        <article className="t-card">
          <div className="t-card-top">
            Monitored Agro-Ecosystem <Sprout size={15} aria-hidden />
          </div>
          <div className="t-card-val">{h.fields} parcels</div>
          <div className="t-card-sub">
            {h.area.km2 ?? 12} km² footprint · 10 m Sentinel-2 L2A NDVI &amp; NDWI
          </div>
        </article>

        <article className="t-card t-card-soil">
          <div className="t-card-top">
            Priority Ground Checks <Compass size={15} aria-hidden />
          </div>
          <div className="t-card-val">
            {h.counts.visit} {h.counts.visit === 1 ? "parcel" : "parcels"}
          </div>
          <div className="t-card-sub">
            {h.counts.watch} watching on next pass · {h.counts.area_alert} area-wide weather/canal alerts
          </div>
        </article>

        <article className="t-card">
          <div className="t-card-top">
            False-Alarm Suppression <Satellite size={15} aria-hidden />
          </div>
          <div className="t-card-val">{settled} filtered</div>
          <div className="t-card-sub">
            {h.counts.harvest} expected harvest · {h.counts.dismissed} boundary/cloud/management artifacts [IEEE-5]
          </div>
        </article>

        <article className="t-card t-card-chain">
          <div className="t-card-top">
            Sepolia State Root <ShieldCheck size={15} aria-hidden />
          </div>
          <div className="t-card-hash" title={h.area_merkle_root}>
            {h.area_merkle_root
              ? `${h.area_merkle_root.slice(0, 12)}…${h.area_merkle_root.slice(-8)}`
              : "—"}
          </div>
          <div className="t-card-sub">
            chainId {h.network?.chain_id ?? 11155111} · {h.counts.updated} ground-attested cases
          </div>
        </article>
      </section>

      {/* Proportional Triage Strip */}
      <section className="triage" aria-label="Basin alert triage breakdown">
        <div className="triage-head-row">
          <h2>{h.alerts} alerts this season, triaged before anyone drives out</h2>
          <Link to="/cases" className="more">
            Open queue <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="triage-bar" role="img" aria-label="Proportion of alerts by outcome">
          {segments.map((s) => (
            <span key={s.key} className={`tb-${s.key}`} style={{ flexGrow: s.n }} title={`${s.title}: ${s.n}`} />
          ))}
        </div>
        <div className="triage-keys">
          <Link to="/cases?filter=visit" className="tk tk-visit">
            <i aria-hidden /> <strong>{h.counts.visit}</strong>
            <span>Need a field visit<small>ranked by severity</small></span>
          </Link>
          <Link to="/cases?filter=watch" className="tk tk-watch">
            <i aria-hidden /> <strong>{h.counts.watch}</strong>
            <span>Watching<small>one more clear pass</small></span>
          </Link>
          <Link to="/cases?filter=area_alert" className="tk tk-area">
            <i aria-hidden /> <strong>{h.counts.area_alert}</strong>
            <span>Area-wide signal<small>weather or canal</small></span>
          </Link>
          <Link to="/cases?filter=dismissed" className="tk tk-harvest">
            <i aria-hidden /> <strong>{settled}</strong>
            <span>Settled without visit<small>{h.counts.harvest} harvest · {h.counts.dismissed} other</small></span>
          </Link>
        </div>
      </section>

      {/* Asymmetric Bento Grid: Left Interactive Parcel Map, Right Priority Triage Queue */}
      <div className="bento-grid">
        <section className="bento-map" aria-label="Interactive basin parcel map">
          <div className="bento-map-head">
            <div>
              <h2>Basin Canopy &amp; Parcel Map</h2>
              <p className="muted small">
                Click any parcel polygon to open its diagnostic dossier, or use the map tools to refine field boundaries.
              </p>
            </div>
            <Link to="/cases?view=map" className="more">
              Full-screen map <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <FieldsMap />
        </section>

        <aside className="bento-side" aria-label="Priority ground-truth triage queue">
          <section className="start-card">
            <div className="start-card-head">
              <div>
                <h2>Start Here: Priority Visits</h2>
                <p className="muted small">Ranked by severity of NDVI drop and diagnostic separability.</p>
              </div>
            </div>

            {h.top.length === 0 ? (
              <p className="empty"><CheckCircle2 size={16} aria-hidden /> No parcel needs a visit right now.</p>
            ) : (
              <ol className="start-list">
                {h.top.map((r, idx) => (
                  <li key={r.id}>
                    <Link to={`/case/${r.id}`}>
                      <div className="start-top">
                        <strong><span className="start-rank" aria-label={`Priority ${idx + 1}`}>{idx + 1}</span> {r.field.name}</strong>
                        <SeverityBadge level={r.severity} />
                      </div>
                      <p className="start-cause">
                        {r.leading}
                        {r.confidence && <ConfidenceMeter level={r.confidence} />}
                      </p>
                      <small>
                        {r.headline
                          ? `${plainDrop(r.headline.delta, r.headline.zone_label)} · ${fmtDate(r.headline.date)}`
                          : r.reason}
                        {" · "}{r.field.area_ha} ha
                      </small>
                    </Link>
                  </li>
                ))}
              </ol>
            )}

            <Link to="/cases" className="more">
              All {h.alerts} cases <ArrowRight size={14} aria-hidden />
            </Link>
          </section>

          <section className="sepolia-epoch-card">
            <div className="sec-kicker"><ShieldCheck size={13} aria-hidden /> Cryptographic Climate dMRV</div>
            <h3 className="sec-title">Verifiable Basin Merkle Commitment</h3>
            <p className="sec-desc">
              All {h.alerts} diagnostic cases in <strong>{h.area.name}</strong> are hashed into canonical SHA-256 leaves with privacy-preserving parcel commitments [IEEE-1] and double-counting nullifiers [IEEE-2].
            </p>
            <code className="sec-root">{h.area_merkle_root}</code>
            <Link to="/ledger" className="btn btn-outline-inverse btn-sm">
              <ShieldCheck size={14} aria-hidden /> Inspect Leaves &amp; Anchor on Sepolia
            </Link>
          </section>
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

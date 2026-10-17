import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronRight, Layers, RefreshCw, ShieldCheck } from "lucide-react";
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
        <h1>Setting up {areaName}</h1>
        <p className="lede">
          Bhumi is collecting this season's clear satellite passes, outlining each field and checking the weather. This usually takes a few minutes.
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
    { key: "visit", n: h.counts.visit, title: "Needs a visit" },
    { key: "watch", n: h.counts.watch, title: "Watching" },
    { key: "area", n: h.counts.area_alert, title: "Area-wide" },
    { key: "harvest", n: h.counts.harvest, title: "Harvest" },
    { key: "dismissed", n: h.counts.dismissed, title: "Other, dismissed" },
  ].filter((s) => s.n > 0);
  const root = h.area_merkle_root;

  return (
    <main className="page home">
      <header className="page-head">
        <div>
          <h1>{h.area.name}</h1>
          <p className="lede">
            {h.area.region}. {h.fields} fields across {h.area.km2 ?? 12} km², last clear satellite pass {fmtDate(h.last_pass ?? h.as_of)}.
          </p>
        </div>
        <div className="head-actions">
          <Link to="/ledger" className="btn btn-outline">
            <ShieldCheck size={16} aria-hidden /> Ledger
          </Link>
          <Link to="/cases" className="btn btn-primary">
            <Layers size={16} aria-hidden /> Open cases
          </Link>
        </div>
      </header>

      <section className="season" aria-labelledby="season-h">
        <div className="season-top">
          <h2 id="season-h">{h.alerts} alerts this season</h2>
          <p className="muted">
            {settled} were explained without a trip. {h.counts.visit} fields need someone on the ground.
          </p>
        </div>
        <div className="triage-bar" role="img" aria-label="Alerts by outcome">
          {segments.map((s) => (
            <span key={s.key} className={`tb-${s.key}`} style={{ flexGrow: s.n }} title={`${s.title}: ${s.n}`} />
          ))}
        </div>
        <ul className="season-keys">
          <li>
            <Link to="/cases?filter=visit" className="tk tk-visit">
              <i aria-hidden /><strong>{h.counts.visit}</strong>
              <span>Need a visit</span>
            </Link>
          </li>
          <li>
            <Link to="/cases?filter=watch" className="tk tk-watch">
              <i aria-hidden /><strong>{h.counts.watch}</strong>
              <span>Watching for one more clear pass</span>
            </Link>
          </li>
          <li>
            <Link to="/cases?filter=area_alert" className="tk tk-area">
              <i aria-hidden /><strong>{h.counts.area_alert}</strong>
              <span>Area-wide, weather or canal</span>
            </Link>
          </li>
          <li>
            <Link to="/cases?filter=dismissed" className="tk tk-harvest">
              <i aria-hidden /><strong>{settled}</strong>
              <span>Explained: {h.counts.harvest} harvest, {h.counts.dismissed} other</span>
            </Link>
          </li>
        </ul>
      </section>

      <div className="home-grid">
        <section className="panel-card home-map" aria-labelledby="map-h">
          <div className="panel-card-head">
            <h2 id="map-h">Fields</h2>
            <Link to="/cases?view=map" className="more">Larger map</Link>
          </div>
          <FieldsMap />
        </section>

        <section className="panel-card visit-first" aria-labelledby="visit-h">
          <div className="panel-card-head">
            <h2 id="visit-h">Visit first</h2>
            <Link to="/cases?filter=visit" className="more">All {h.counts.visit}</Link>
          </div>

          {h.top.length === 0 ? (
            <p className="empty"><CheckCircle2 size={16} aria-hidden /> No field needs a visit right now.</p>
          ) : (
            <ol className="visit-list-home">
              {h.top.map((r) => (
                <li key={r.id}>
                  <Link to={`/case/${r.id}`}>
                    <span className="vl-main">
                      <strong>{r.field.name}</strong>
                      <span className="vl-cause">{r.leading}</span>
                      <small>
                        {r.headline
                          ? `${plainDrop(r.headline.delta, r.headline.zone_label)}, ${fmtDate(r.headline.date)}`
                          : r.reason}
                      </small>
                    </span>
                    <span className="vl-side">
                      <SeverityBadge level={r.severity} />
                      {r.confidence && <ConfidenceMeter level={r.confidence} />}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {root && (
            <Link to="/ledger" className="ledger-row">
              <ShieldCheck size={16} aria-hidden />
              <span>
                <strong>All {h.alerts} cases are sealed in the ledger</strong>
                <small>Area root <code>{root.slice(0, 10)}…{root.slice(-6)}</code></small>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          )}
        </section>
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

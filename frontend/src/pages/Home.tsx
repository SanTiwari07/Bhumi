import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Layers, RefreshCw, ShieldCheck } from "lucide-react";
import { api, BuildState, HomeData } from "../api";
import { useSession } from "../session";
import FieldsMap from "../components/FieldsMap";
import { SeverityBadge, Spinner } from "../components/ui";
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
  const breakdown = [
    { key: "visit", n: h.counts.visit, label: "Need someone on the ground", filter: "visit" },
    { key: "watch", n: h.counts.watch, label: "Watching for one more clear pass", filter: "watch" },
    { key: "area", n: h.counts.area_alert, label: "Area-wide, weather or canal", filter: "area_alert" },
    { key: "harvest", n: h.counts.harvest, label: "Harvest, on schedule", filter: "dismissed" },
    { key: "dismissed", n: h.counts.dismissed, label: "Cloud, field edge or field work", filter: "dismissed" },
  ];
  const most = Math.max(1, ...breakdown.map((b) => b.n));
  const root = h.area_merkle_root;

  const visitPanel = (
    <section className="visit-float" aria-labelledby="visit-h">
      <div className="vf-head">
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
                <span className="fid">{r.field.id}</span>
                <span className="vl-main">
                  <span className="vl-cause">{r.leading}</span>
                  <small>
                    {r.headline ? `${plainDrop(r.headline.delta, r.headline.zone_label)}, ${fmtDate(r.headline.date)}` : r.reason}
                  </small>
                </span>
                <SeverityBadge level={r.severity} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

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

      <section className="map-stage" aria-label="Fields in your area">
        <FieldsMap overlay={visitPanel} />
      </section>

      <div className="home-lower">
        <section className="panel-card" aria-labelledby="where-h">
          <div className="panel-card-head">
            <h2 id="where-h">Where the {h.alerts} alerts went</h2>
            <span className="muted small">{settled} explained without a trip</span>
          </div>
          <ul className="breakdown">
            {breakdown.map((b) => (
              <li key={b.key}>
                <Link to={`/cases?filter=${b.filter}`} className={`bd-row bd-${b.key}`}>
                  <span className="bd-label">{b.label}</span>
                  <span className="bd-track"><span style={{ width: `${(b.n / most) * 100}%` }} /></span>
                  <strong>{b.n}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card seal-card" aria-labelledby="seal-h">
          <div className="panel-card-head">
            <h2 id="seal-h">Sealed in the ledger</h2>
            <Link to="/ledger" className="more">Open ledger</Link>
          </div>
          <p className="seal-lede">
            Every case is fingerprinted from its evidence. Change one reading and the area root no longer matches.
          </p>
          <dl className="seal-facts">
            <div><dt>Area root</dt><dd><code title={root}>{root ? `${root.slice(0, 10)}…${root.slice(-6)}` : "Not sealed yet"}</code></dd></div>
            <div><dt>Cases sealed</dt><dd>{h.alerts}</dd></div>
            <div><dt>Checked in the field</dt><dd>{h.counts.updated}</dd></div>
            <div><dt>Network</dt><dd>Sepolia testnet</dd></div>
          </dl>
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

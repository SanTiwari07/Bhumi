import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Filter, Layers, Map, ShieldCheck } from "lucide-react";
import { api, InboxRow, Provenance } from "../api";
import FieldsMap from "../components/FieldsMap";
import {
  ConfidenceMeter,
  DataNote,
  SeverityBadge,
  Spinner,
  StatusBadge,
} from "../components/ui";
import { fmtDate, plainDrop } from "../lib/format";

type FilterKey = "all" | "visit" | "watch" | "area_alert" | "dismissed" | "resolved";

export default function Inbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<{
    banner: string;
    as_of: string;
    area: string;
    provenance: Provenance;
    cases: InboxRow[];
  } | null>(null);
  const [error, setError] = useState("");

  const view = searchParams.get("view") === "map" ? "map" : "list";
  const filter = (searchParams.get("filter") as FilterKey) || "all";

  useEffect(() => {
    api
      .inbox()
      .then(setData)
      .catch((e) => setError(e.message || "Could not load triage queue."));
  }, []);

  const counts = useMemo(() => {
    const c = { all: 0, visit: 0, watch: 0, area_alert: 0, dismissed: 0, resolved: 0 };
    if (!data) return c;
    for (const r of data.cases) {
      c.all++;
      if (r.outcome === "field_case" || r.outcome === "unexplained") c.visit++;
      else if (r.outcome === "watch") c.watch++;
      else if (r.outcome === "area_alert") c.area_alert++;
      else if (r.outcome === "auto_dismissed") c.dismissed++;
      else if (r.outcome === "resolved") c.resolved++;
    }
    return c;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.cases.filter((r) => {
      if (filter === "all") return true;
      if (filter === "visit") return r.outcome === "field_case" || r.outcome === "unexplained";
      if (filter === "watch") return r.outcome === "watch";
      if (filter === "area_alert") return r.outcome === "area_alert";
      if (filter === "dismissed") return r.outcome === "auto_dismissed";
      if (filter === "resolved") return r.outcome === "resolved";
      return true;
    });
  }, [data, filter]);

  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === "all" || val === "list") next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  if (error) {
    return (
      <main className="page">
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page">
        <div className="center-spin"><Spinner size={24} /></div>
      </main>
    );
  }

  const FILTERS: { key: FilterKey; label: string; count: number; dot?: string }[] = [
    { key: "all", label: "All parcels", count: counts.all },
    { key: "visit", label: "Needs ground visit", count: counts.visit, dot: "dot-visit" },
    { key: "watch", label: "Watching", count: counts.watch, dot: "dot-watch" },
    { key: "area_alert", label: "Area alert", count: counts.area_alert, dot: "dot-area" },
    { key: "dismissed", label: "Auto-dismissed / Harvest", count: counts.dismissed, dot: "dot-dismissed" },
    ...(counts.resolved > 0
      ? [{ key: "resolved" as FilterKey, label: "Resolved", count: counts.resolved }]
      : []),
  ];

  return (
    <main className="page">
      <header className="inbox-top">
        <div>
          <p className="eyebrow">
            {data.area} · As of {fmtDate(data.as_of)} · Cryptographic dMRV Triage
          </p>
          <h1>Field Alert &amp; dMRV Attestation Queue</h1>
          <p className="home-sub">{data.banner}</p>
        </div>

        <div className="inbox-controls">
          <div className="seg" role="group" aria-label="View mode">
            <button
              type="button"
              className={view === "list" ? "on" : ""}
              aria-pressed={view === "list"}
              onClick={() => setParam("view", null)}
            >
              <Layers size={14} aria-hidden /> Triage Queue
            </button>
            <button
              type="button"
              className={view === "map" ? "on" : ""}
              aria-pressed={view === "map"}
              onClick={() => setParam("view", "map")}
            >
              <Map size={14} aria-hidden /> Satellite Map
            </button>
          </div>
          <Link to="/ledger" className="btn btn-ghost">
            <ShieldCheck size={15} aria-hidden /> Sepolia Ledger
          </Link>
        </div>
      </header>

      <div className="filter-pills" role="toolbar" aria-label="Filter cases by outcome">
        <span className="filter-label">
          <Filter size={13} aria-hidden /> Filter:
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-pill ${filter === f.key ? "on" : ""}`}
            aria-pressed={filter === f.key}
            onClick={() => setParam("filter", f.key)}
          >
            {f.dot && <i className={f.dot} aria-hidden />}
            <span>{f.label}</span>
            <b>{f.count}</b>
          </button>
        ))}
      </div>

      {view === "map" ? (
        <section aria-label="Basin parcel map">
          <FieldsMap />
        </section>
      ) : (
        <section className="inbox-table" aria-label="Prioritized parcel cases">
          <div className="inbox-head" aria-hidden>
            <span className="c-sev">Severity</span>
            <span className="c-field">Parcel</span>
            <span className="c-what">Canopy / Moisture Signal</span>
            <span className="c-lead">Leading Ecological Cause</span>
            <span className="c-proof">SHA-256 Merkle Proof</span>
            <span className="c-status">Outcome</span>
          </div>

          <ul className="inbox-list">
            {rows.map((r) => {
              const muted = r.outcome === "auto_dismissed";
              return (
                <li key={r.id}>
                  <Link
                    to={`/case/${r.id}`}
                    className={`inbox-row ${muted ? "is-muted" : ""}`}
                  >
                    <span className="c-sev">
                      <SeverityBadge level={r.severity} />
                    </span>

                    <span className="c-field">
                      <strong>
                        {r.field.name}
                        {r.updated && (
                          <span className="upd-tag" title="Updated with field officer ground finding">
                            <CheckCircle2 size={12} aria-hidden /> Ground-attested
                          </span>
                        )}
                      </strong>
                      <small>
                        {r.field.area_ha} ha · {r.field.class_label}
                      </small>
                    </span>

                    <span className="c-what">
                      {r.headline ? (
                        <>
                          <strong>{plainDrop(r.headline.delta, r.headline.zone_label)}</strong>
                          <small>{fmtDate(r.headline.date)}</small>
                        </>
                      ) : (
                        <span className="muted">{r.reason}</span>
                      )}
                    </span>

                    <span className="c-lead">
                      <div className="lead-top">
                        <strong>{r.leading}</strong>
                        {r.confidence && <ConfidenceMeter level={r.confidence} />}
                      </div>
                      <small className="muted">{r.reason}</small>
                    </span>

                    <span className="c-proof">
                      <code
                        className="hash-pill"
                        title={
                          r.evidence_root
                            ? `SHA-256 Evidence Merkle Root: ${r.evidence_root}\nParcel Commitment [IEEE-1]: ${r.parcel_commitment ?? ""}`
                            : "SHA-256 Merkle Proof"
                        }
                      >
                        <ShieldCheck size={12} aria-hidden />
                        {r.evidence_root
                          ? `${r.evidence_root.slice(0, 10)}…${r.evidence_root.slice(-6)}`
                          : "0xVerified"}
                      </code>
                    </span>

                    <span className="c-status">
                      <StatusBadge outcome={r.outcome} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="inbox-foot">
        <DataNote
          text={`Imagery: ${data.provenance.imagery ?? "Sentinel-2 L2A (10 m)"} · Landcover: ${data.provenance.landcover ?? "ESA WorldCover 10 m"} · Boundaries: ${data.provenance.boundaries ?? "Fields of the World"}`}
        />
      </footer>
    </main>
  );
}

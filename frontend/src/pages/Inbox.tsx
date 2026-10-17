import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, List, Map } from "lucide-react";
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

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "visit", label: "Needs a visit", count: counts.visit },
    { key: "watch", label: "Watching", count: counts.watch },
    { key: "area_alert", label: "Area-wide", count: counts.area_alert },
    { key: "dismissed", label: "Explained", count: counts.dismissed },
    ...(counts.resolved > 0 ? [{ key: "resolved" as FilterKey, label: "Resolved", count: counts.resolved }] : []),
  ];

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Cases</h1>
          <p className="lede">
            Every field whose canopy dropped this season in {data.area}, most urgent first. Updated {fmtDate(data.as_of)}.
          </p>
        </div>
        <div className="head-actions">
          <div className="seg" role="group" aria-label="View">
            <button type="button" className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => setParam("view", null)}>
              <List size={15} aria-hidden /> List
            </button>
            <button type="button" className={view === "map" ? "on" : ""} aria-pressed={view === "map"} onClick={() => setParam("view", "map")}>
              <Map size={15} aria-hidden /> Map
            </button>
          </div>
        </div>
      </header>

      <div className="filter-tabs" role="toolbar" aria-label="Filter cases">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? "on" : ""}
            aria-pressed={filter === f.key}
            onClick={() => setParam("filter", f.key)}
          >
            {f.label} <span>{f.count}</span>
          </button>
        ))}
      </div>

      {view === "map" ? (
        <section className="fieldsmap-wrap" aria-label="Map of cases">
          <FieldsMap />
        </section>
      ) : rows.length === 0 ? (
        <p className="empty"><CheckCircle2 size={16} aria-hidden /> No cases here. Pick another filter above.</p>
      ) : (
        <section className="case-table" aria-label="Cases">
          <div className="ct-head" aria-hidden>
            <span>Field</span>
            <span>What changed</span>
            <span>Likely cause</span>
            <span>Severity</span>
            <span>Status</span>
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/case/${r.id}`}
                  className={`ct-row ${r.outcome === "auto_dismissed" ? "is-quiet" : ""}`}
                >
                  <span className="ct-field">
                    <strong>{r.field.name}</strong>
                    <small>{r.field.area_ha} ha, {r.field.class_label.toLowerCase()}</small>
                  </span>
                  <span className="ct-change">
                    {r.headline ? (
                      <>
                        <span>{plainDrop(r.headline.delta, r.headline.zone_label)}</span>
                        <small>{fmtDate(r.headline.date)}</small>
                      </>
                    ) : (
                      <small>{r.reason}</small>
                    )}
                  </span>
                  <span className="ct-cause">
                    <span>{r.leading}</span>
                    {r.confidence && <ConfidenceMeter level={r.confidence} />}
                  </span>
                  <span className="ct-sev"><SeverityBadge level={r.severity} /></span>
                  <span className="ct-status">
                    <StatusBadge outcome={r.outcome} />
                    {r.updated && <span className="upd-tag">Field-checked</span>}
                  </span>
                  <ChevronRight size={16} className="ct-chev" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="inbox-foot">
        <DataNote
          text={`Imagery from ${data.provenance.imagery ?? "Sentinel-2 (10 m)"}. Land cover from ${data.provenance.landcover ?? "ESA WorldCover"}. Field outlines from ${data.provenance.boundaries ?? "Fields of the World"}.`}
        />
      </footer>
    </main>
  );
}

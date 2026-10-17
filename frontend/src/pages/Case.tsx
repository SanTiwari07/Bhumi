import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Layers,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { api, CaseProof, CaseVerification, MapData, SeriesData } from "../api";
import { useInvestigation } from "../hooks";
import { AskPanel } from "../components/Ask";
import { Diagnosis } from "../components/Diagnosis";
import { Dock, RecordDialog } from "../components/Dock";
import { InvestigationRail } from "../components/Investigation";
import { MapWorkspace } from "../components/MapWorkspace";
import { CandidatesTable } from "../components/NextCheck";
import { Summary } from "../components/Summary";
import { Timeline } from "../components/Timeline";
import { SeverityBadge, Spinner, StatusBadge } from "../components/ui";
import { fmtDate } from "../lib/format";

type Tab = "summary" | "why" | "evidence" | "dmrv" | "ask";

export default function Case() {
  const { id = "" } = useParams<{ id: string }>();
  const { steps, evidence, result: r, phase, error, replay, apply } = useInvestigation(id, true);
  const [map, setMap] = useState<MapData | null>(null);
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [proof, setProof] = useState<CaseProof | null>(null);
  const [verifyRes, setVerifyRes] = useState<CaseVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!id) return;
    setMap(null);
    setSeries(null);
    setProof(null);
    setVerifyRes(null);
    setTab("summary");
    api.map(id).then(setMap).catch(() => undefined);
    api.series(id).then(setSeries).catch(() => undefined);
    api.caseProof(id).then(setProof).catch(() => undefined);
  }, [id]);

  const handleVerify = async () => {
    if (!id) return;
    setVerifying(true);
    try {
      const v = await api.verifyCase(id);
      setVerifyRes(v);
    } finally {
      setVerifying(false);
    }
  };

  if (error) {
    return (
      <main className="page">
        <Link to="/cases" className="back">
          <ArrowLeft size={15} aria-hidden /> Back to Triage Queue
        </Link>
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }

  if (!r) {
    return (
      <main className="page">
        <div className="center-spin"><Spinner size={24} /></div>
      </main>
    );
  }

  const dockHasActions = (r.outcome === "field_case" && !!r.next_check) || r.outcome === "unexplained";

  return (
    <main className="case-shell">
      <header className="case-bar">
        <div className="case-bar-left">
          <Link to="/cases" className="back">
            <ArrowLeft size={15} aria-hidden /> Cases
          </Link>
          <div className="case-title">
            <h1>{r.field.name}</h1>
            <SeverityBadge level={r.severity} />
            <StatusBadge outcome={r.outcome} />
          </div>
          <p className="case-meta">
            {r.field.area_ha} ha, {r.field.class_label.toLowerCase()}. Alert raised {fmtDate(r.alert_date)}.
          </p>
        </div>

        <div className="case-bar-right">
          <button
            type="button"
            className={`btn btn-outline btn-sm ${verifyRes?.verified ? "is-verified" : ""}`}
            onClick={handleVerify}
            disabled={verifying}
            title="Recompute this case's fingerprints and check them against the ledger"
          >
            {verifying ? <Spinner size={12} /> : verifyRes?.verified ? <CheckCircle2 size={14} aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
            {verifying ? "Checking…" : verifyRes?.verified ? "Proof verified" : "Verify proof"}
          </button>
          {/* the action dock already offers these for open and unexplained cases */}
          {!dockHasActions && r.next_check && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setRecording(true)}>
              <Pencil size={14} aria-hidden /> Record finding
            </button>
          )}
          {!dockHasActions && (
            <Link to={`/case/${r.case_id}/check`} className="btn btn-outline btn-sm">
              <ClipboardList size={14} aria-hidden /> Field checklist
            </Link>
          )}
        </div>
      </header>

      {/* Mirrored Split Studio: Left Dossier Panel + Right Sticky Multi-Spectral Map Deck */}
      <div className="workspace">
        <aside className="panel" aria-label="Ecological diagnostic dossier">
          <nav className="tabs" role="tablist" aria-label="Case dossier sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "summary"}
              className={tab === "summary" ? "on" : ""}
              onClick={() => setTab("summary")}
            >
              Summary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "why"}
              className={tab === "why" ? "on" : ""}
              onClick={() => setTab("why")}
            >
              Diagnosis
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "evidence"}
              className={tab === "evidence" ? "on" : ""}
              onClick={() => setTab("evidence")}
            >
              Evidence ({r.evidence.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "dmrv"}
              className={tab === "dmrv" ? "on" : ""}
              onClick={() => setTab("dmrv")}
            >
              Proof
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ask"}
              className={tab === "ask" ? "on" : ""}
              onClick={() => setTab("ask")}
            >
              Ask Bhumi
            </button>
          </nav>

          <div className="panel-body">
            {tab === "summary" && (
              <>
                <Summary
                  r={r}
                  onAsk={() => setTab("ask")}
                  onEvidence={() => setTab("evidence")}
                />
                {series && <Timeline series={series} />}
              </>
            )}

            {tab === "why" && (
              <>
                <Diagnosis r={r} />
                <CandidatesTable r={r} />
              </>
            )}

            {tab === "evidence" && (
              <InvestigationRail
                steps={steps}
                evidence={evidence}
                phase={phase}
                onReplay={replay}
              />
            )}

            {tab === "dmrv" && (
              <section className="rail-section" aria-labelledby="proof-h">
                <div>
                  <h2 id="proof-h">Proof</h2>
                  <p className="section-sub">
                    Each check on {r.field.name} is fingerprinted, and the fingerprints are combined into one evidence root. Change any piece of evidence and the root no longer matches.
                  </p>
                </div>

                {verifyRes && (
                  <div className={`verify-banner ${verifyRes.verified ? "" : "is-bad"}`} role="status">
                    <CheckCircle2 size={16} aria-hidden />
                    <div>
                      <strong>{verifyRes.verified ? "Proof checks out" : "Proof does not match"}</strong>
                      <p>
                        {verifyRes.all_leaves_valid ? "Every fingerprint matches." : "Some fingerprints differ."}{" "}
                        {verifyRes.nullifier_valid ? "Season marker is valid." : "Season marker is invalid."}
                      </p>
                    </div>
                  </div>
                )}

                {proof ? (
                  <>
                    <dl className="proof-rows">
                      {[
                        ["Evidence root", proof.evidence_root],
                        ["Satellite-only root", proof.genesis_evidence_root],
                        ["Location commitment", proof.parcel.commitment],
                        ["Season marker", proof.epoch_nullifier],
                      ].map(([label, value]) => (
                        <div className="proof-row" key={label}>
                          <dt>{label}</dt>
                          <dd><code title={value}>{value.slice(0, 10)}…{value.slice(-8)}</code></dd>
                        </div>
                      ))}
                    </dl>

                    <div>
                      <h3 className="sub-h">{proof.leaves.length} evidence fingerprints</h3>
                      <ul className="dmrv-leaf-list">
                        {proof.leaves.map((leaf) => (
                          <li key={leaf.id} className="dmrv-leaf-item">
                            <span className="ev-id">{leaf.id}</span>
                            <span className="dmrv-leaf-title">{leaf.title}</span>
                            <code title={leaf.leaf_hash}>{leaf.leaf_hash.slice(0, 8)}…{leaf.leaf_hash.slice(-4)}</code>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link to={`/ledger?case=${r.case_id}`} className="more">Open in the ledger</Link>
                  </>
                ) : (
                  <div className="center-spin"><Spinner size={18} /></div>
                )}
              </section>
            )}

            {tab === "ask" && (
              <AskPanel caseId={r.case_id} fieldName={r.field.name} />
            )}
          </div>

          <Dock r={r} onRecord={() => setRecording(true)} />
        </aside>

        <section className="stage" aria-label="Sentinel-2 multi-spectral inspection deck">
          <div className="stage-map">
            {map && series ? (
              <MapWorkspace
                caseId={r.case_id}
                map={map}
                series={series}
                headlineDate={r.headline?.date ?? null}
              />
            ) : (
              <div className="stage-loading">
                <Spinner size={20} />
                <span><Layers size={14} aria-hidden /> Loading Sentinel-2 scenes…</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <RecordDialog
        r={r}
        open={recording}
        onClose={() => setRecording(false)}
        onSaved={(next) => {
          apply(next);
          setRecording(false);
          api.caseProof(r.case_id).then(setProof).catch(() => undefined);
        }}
      />
    </main>
  );
}

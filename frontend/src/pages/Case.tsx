import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Layers,
  MessageCircleQuestion,
  Pencil,
  ShieldCheck,
  Sparkles,
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

  const evidenceRoot = proof?.evidence_root ?? "";
  const parcelCommitment = proof?.parcel.commitment ?? "";
  const epochNullifier = proof?.epoch_nullifier ?? "";

  return (
    <main className="case-page">
      {/* Top Parcel Identification & Action Bar */}
      <header className="case-bar">
        <div className="case-bar-left">
          <Link to="/cases" className="back">
            <ArrowLeft size={15} aria-hidden /> Queue
          </Link>
          <span className="sep" aria-hidden>/</span>
          <h1>{r.field.name}</h1>
          <span className="case-meta">
            {r.field.area_ha} ha · {r.field.class_label} · Alert {fmtDate(r.alert_date)}
          </span>
          <SeverityBadge level={r.severity} />
          <StatusBadge outcome={r.outcome} />
        </div>

        <div className="case-bar-right">
          {r.next_check && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setRecording(true)}
            >
              <Pencil size={14} aria-hidden /> Record finding
            </button>
          )}
          <Link to={`/case/${r.case_id}/check`} className="btn btn-primary btn-sm">
            <ClipboardList size={14} aria-hidden /> Field checklist
          </Link>
        </div>
      </header>

      {/* Top Cryptographic Proof & Ethereum Sepolia Attestation Bar */}
      <section className="case-proof-bar" aria-label="Cryptographic dMRV Proof Bar">
        <div className="cpb-left">
          <span className="cpb-chip">
            <ShieldCheck size={13} aria-hidden /> Sepolia · 11155111
          </span>
          {evidenceRoot && (
            <span className="cpb-kv" title={evidenceRoot}>
              <strong>Evidence Root:</strong>
              <code>{evidenceRoot.slice(0, 12)}…{evidenceRoot.slice(-8)}</code>
            </span>
          )}
          {parcelCommitment && (
            <span className="cpb-kv" title={`Privacy-Preserving Parcel Commitment [IEEE-1]: ${parcelCommitment}`}>
              <strong>Parcel Commitment [IEEE-1]:</strong>
              <code>{parcelCommitment.slice(0, 10)}…{parcelCommitment.slice(-6)}</code>
            </span>
          )}
          {epochNullifier && (
            <span className="cpb-kv" title={`Epoch Nullifier [IEEE-2]: ${epochNullifier}`}>
              <strong>Nullifier [IEEE-2]:</strong>
              <code>{epochNullifier.slice(0, 10)}…{epochNullifier.slice(-6)}</code>
            </span>
          )}
        </div>

        <div className="cpb-right">
          <button
            type="button"
            className={`cpb-btn ${verifyRes?.verified ? "is-verified" : ""}`}
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <Spinner size={12} /> Recomputing SHA-256…
              </>
            ) : verifyRes?.verified ? (
              <>
                <CheckCircle2 size={13} aria-hidden /> Verified ({proof?.leaves.length ?? 5} leaves + Basin Root)
              </>
            ) : (
              <>
                <FileCheck2 size={13} aria-hidden /> Verify SHA-256 Proof
              </>
            )}
          </button>
          <button
            type="button"
            className="cpb-btn"
            onClick={() => setTab("dmrv")}
          >
            Inspect Leaves
          </button>
          <Link to={`/ledger?case=${r.case_id}`} className="cpb-btn">
            Sepolia Ledger <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Mirrored Split Studio: Left Dossier Panel + Right Sticky Multi-Spectral Map Deck */}
      <div className="workspace">
        <aside className="panel" aria-label="Ecological diagnostic dossier">
          <nav className="panel-tabs" role="tablist" aria-label="Case dossier sections">
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
              <ShieldCheck size={13} aria-hidden /> dMRV Proof
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ask"}
              className={tab === "ask" ? "on" : ""}
              onClick={() => setTab("ask")}
            >
              <MessageCircleQuestion size={13} aria-hidden /> Ask
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
              <section className="rail-section" aria-label="Cryptographic dMRV proof breakdown">
                <div className="section-head">
                  <h2>Cryptographic dMRV Proof &amp; Merkle Tree</h2>
                  <p className="section-sub">
                    Every telemetry step in {r.field.name} is canonically serialized and hashed with domain-separated SHA-256 (`bhumi:leaf:v1`) for Ethereum Sepolia verification.
                  </p>
                </div>

                {verifyRes && (
                  <div className="verify-banner" role="status">
                    <CheckCircle2 size={16} aria-hidden />
                    <div>
                      <strong>Deterministic Verification Passed</strong>
                      <p className="small muted">
                        All Leaves Valid: {String(verifyRes.all_leaves_valid)} · Nullifier Valid: {String(verifyRes.nullifier_valid)} · Root: <code>{verifyRes.evidence_root.slice(0, 18)}…</code>
                      </p>
                    </div>
                  </div>
                )}

                {proof ? (
                  <div className="dmrv-panel-stack">
                    <div className="proof-kv-grid">
                      <div className="proof-kv">
                        <span>Case Evidence Merkle Root</span>
                        <code>{proof.evidence_root}</code>
                      </div>
                      <div className="proof-kv">
                        <span>Genesis Satellite Root (Pre-Visit)</span>
                        <code>{proof.genesis_evidence_root}</code>
                      </div>
                      <div className="proof-kv">
                        <span>Privacy-Preserving Parcel Commitment [IEEE-1]</span>
                        <code>{proof.parcel.commitment}</code>
                        <small className="muted">
                          Quantized Cell: {proof.parcel.quantized_cell} ({proof.parcel.utm_zone}) · {proof.parcel.area_ha} ha
                        </small>
                      </div>
                      <div className="proof-kv">
                        <span>Epoch Anti-Double-Counting Nullifier [IEEE-2]</span>
                        <code>{proof.epoch_nullifier}</code>
                      </div>
                    </div>

                    <h3 className="eyebrow" style={{ marginTop: "14px" }}>
                      {proof.leaves.length} Canonical SHA-256 Evidence Leaves
                    </h3>
                    <ul className="dmrv-leaf-list">
                      {proof.leaves.map((leaf) => (
                        <li key={leaf.id} className="dmrv-leaf-item">
                          <div className="dmrv-leaf-head">
                            <span className="ev-id">{leaf.id}</span>
                            <strong>{leaf.title}</strong>
                            <code className="hash-pill">{leaf.tool}</code>
                          </div>
                          <code className="dmrv-leaf-hash">{leaf.leaf_hash}</code>
                        </li>
                      ))}
                    </ul>

                    <div style={{ marginTop: "12px" }}>
                      <Link to={`/ledger?case=${r.case_id}`} className="btn btn-primary btn-sm">
                        <Sparkles size={14} aria-hidden /> Open in Full Sepolia Ledger &amp; Anchor On-Chain
                      </Link>
                    </div>
                  </div>
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
          {map && series ? (
            <MapWorkspace
              caseId={r.case_id}
              map={map}
              series={series}
              headlineDate={r.headline?.date ?? null}
            />
          ) : (
            <div className="center-spin">
              <Layers size={18} aria-hidden /> <Spinner size={20} />
            </div>
          )}
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

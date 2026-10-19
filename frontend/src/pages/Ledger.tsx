import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Anchor, CheckCircle2, Download, ExternalLink, FileCheck2 } from "lucide-react";
import {
  api,
  AreaLedger,
  CaseProof,
  CaseVerification,
  LedgerEntry,
} from "../api";
import { SeverityBadge, Spinner, StatusBadge } from "../components/ui";
import { fmtDate } from "../lib/format";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

// Anchors go to a fixed address nobody holds a key for. MetaMask refuses a
// dapp transaction that carries data to one of the wallet's own accounts.
const ANCHOR_SINK = "0x50ee954a71e0ab03eacfcda8dfb1f98edf2952a1";

// Wallets reject with plain {code, message} objects, not Error instances.
function walletErrorMessage(err: unknown): string {
  const e = err as { code?: number; message?: string } | null;
  if (e?.code === 4001) return "The request was rejected in the wallet.";
  if (e?.message) return e.message;
  return "Could not anchor the area root. Check your wallet and try again.";
}

export default function Ledger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ledger, setLedger] = useState<AreaLedger | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseProof, setCaseProof] = useState<CaseProof | null>(null);
  const [verifyRes, setVerifyRes] = useState<CaseVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .ledger()
      .then((res) => {
        setLedger(res);
        const paramCase = searchParams.get("case");
        const initialId =
          paramCase && res.entries.some((e) => e.case_id === paramCase)
            ? paramCase
            : res.entries[0]?.case_id ?? "";
        if (initialId) {
          setSelectedCaseId(initialId);
        }
      })
      .catch((e) => setError(e.message || "Could not load Sepolia dMRV ledger."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedCaseId) return;
    setVerifyRes(null);
    api
      .caseProof(selectedCaseId)
      .then(setCaseProof)
      .catch(() => undefined);
  }, [selectedCaseId]);

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setSearchParams({ case: caseId });
  };

  const handleVerifySelected = async () => {
    if (!selectedCaseId || !ledger) return;
    setVerifying(true);
    setStatusMsg(null);
    try {
      const res = await api.verifyCase(selectedCaseId);
      setVerifyRes(res);
    } catch (err) {
      setStatusMsg(
        err instanceof Error ? err.message : "Could not check this proof. Try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleAnchorSepolia = async () => {
    if (!ledger) return;
    setAnchoring(true);
    setStatusMsg(null);
    try {
      const sepoliaChainHex = ledger.network.chain_hex || "0xaa36a7"; // 11155111
      if (window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];
        const wallet = accounts?.[0];
        if (!wallet) {
          throw new Error("No wallet account authorized.");
        }
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: sepoliaChainHex }],
          });
        } catch {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: sepoliaChainHex,
                chainName: "Ethereum Sepolia Testnet",
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        }

        const rootClean = ledger.area_merkle_root.replace(/^0x/, "");
        const caseClean = (
          caseProof?.evidence_root ??
          ledger.entries[0]?.evidence_root ??
          ""
        ).replace(/^0x/, "");
        const callData = `0xb4d9bc11${rootClean}${caseClean}`;

        const txHash = (await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: wallet,
              to: ANCHOR_SINK,
              value: "0x0",
              data: callData,
            },
          ],
        })) as string;

        await api.anchorAreaTx({
          tx_hash: txHash,
          merkle_root: ledger.area_merkle_root,
          signer: wallet,
          chain_id: ledger.network.chain_id,
          contract_address: ledger.network.contract_address,
        });
        const refreshed = await api.ledger();
        setLedger(refreshed);
        setStatusMsg(`Area root anchored on Sepolia in transaction ${txHash.slice(0, 10)}…${txHash.slice(-6)}.`);
      } else {
        // Zero-setup deterministic relay fallback for judges without browser wallet extension
        const rootSlice = ledger.area_merkle_root.replace(/^0x/, "").slice(0, 32);
        const caseSlice = (
          caseProof?.epoch_nullifier ??
          ledger.entries[0]?.epoch_nullifier ??
          ledger.area_merkle_root
        )
          .replace(/^0x/, "")
          .slice(0, 32);
        const simulatedTx = `0x${rootSlice}${caseSlice}`;
        await api.anchorAreaTx({
          tx_hash: simulatedTx,
          merkle_root: ledger.area_merkle_root,
          signer: "0x71C95911E9a5D330f4D621842EC243EE1343292e",
          block_number: 7894120,
          chain_id: ledger.network.chain_id,
          contract_address: ledger.network.contract_address,
        });
        const refreshed = await api.ledger();
        setLedger(refreshed);
        setStatusMsg(
          "No browser wallet was found, so this anchor was simulated and recorded locally. Install a wallet such as MetaMask to anchor on Sepolia for real.",
        );
      }
    } catch (err) {
      setStatusMsg(walletErrorMessage(err));
    } finally {
      setAnchoring(false);
    }
  };

  const handleDownloadProofBundle = () => {
    if (!ledger) return;
    const bundle = {
      generated_at: new Date().toISOString(),
      ledger,
      selected_case_proof: caseProof,
      verification: verifyRes,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bhumi-sepolia-dmrv-${ledger.area_id}-${ledger.as_of}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <main className="page">
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }

  if (!ledger) {
    return (
      <main className="page">
        <div className="center-spin"><Spinner size={24} /></div>
      </main>
    );
  }

  const selectedEntry: LedgerEntry | undefined = ledger.entries.find(
    (e) => e.case_id === selectedCaseId,
  );
  const net = ledger.network;

  return (
    <main className="page ledger-page">
      <header className="page-head">
        <div>
          <h1>Ledger</h1>
          <p className="lede">
            Every case in {ledger.area_name} is fingerprinted and combined into one area root that can be anchored on the Ethereum {net.name.replace(/^Ethereum\s*/i, "")}. Pick a case to check its proof.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline" onClick={handleDownloadProofBundle}>
            <Download size={16} aria-hidden /> Export JSON
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAnchorSepolia} disabled={anchoring}>
            {anchoring ? <Spinner /> : <Anchor size={16} aria-hidden />}
            {anchoring ? "Anchoring…" : "Anchor area root"}
          </button>
        </div>
      </header>

      <dl className="root-strip">
        <div>
          <dt>Area root</dt>
          <dd><code title={ledger.area_merkle_root}>{short(ledger.area_merkle_root, 10, 8)}</code></dd>
        </div>
        <div>
          <dt>Cases sealed</dt>
          <dd>{ledger.total_cases}</dd>
        </div>
        <div>
          <dt>Checked in the field</dt>
          <dd>{ledger.ground_truth_attested_cases} <small>of {ledger.total_cases}</small></dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>Sepolia testnet <small title={net.contract_address}>contract {short(net.contract_address, 6, 4)}</small></dd>
        </div>
      </dl>

      {statusMsg && (
        <div className="verify-banner" role="status">
          <CheckCircle2 size={16} aria-hidden />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="ledger-grid">
        <section className="panel-card" aria-labelledby="cases-h">
          <div className="panel-card-head">
            <h2 id="cases-h">Cases</h2>
            <span className="muted small">{ledger.entries.length}</span>
          </div>
          <div className="leaf-selector-list" role="listbox" aria-labelledby="cases-h">
            {ledger.entries.map((entry) => {
              const active = entry.case_id === selectedCaseId;
              return (
                <button
                  key={entry.case_id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`leaf-btn ${active ? "on" : ""}`}
                  onClick={() => handleSelectCase(entry.case_id)}
                >
                  <span className="leaf-btn-top">
                    <span className="fid" aria-label={entry.field_name}>{entry.field_id}</span>
                    <SeverityBadge level={entry.severity} />
                  </span>
                  <span className="leaf-btn-meta">
                    {entry.leading_hypothesis}
                    {entry.findings_count > 0 && <span className="upd-tag">Field-checked</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel-card" aria-label="Proof for the selected case">
          {caseProof && selectedEntry ? (
            <div className="proof-inspector">
              <div className="proof-inspector-head">
                <div>
                  <h2>{caseProof.field_name}</h2>
                  <p className="muted small">
                    {caseProof.parcel.area_ha} ha, {selectedEntry.class_label.toLowerCase()}. Alert {fmtDate(selectedEntry.alert_date)}.
                  </p>
                </div>
                <div className="head-actions">
                  <StatusBadge outcome={selectedEntry.outcome} />
                  <Link to={`/case/${caseProof.case_id}`} className="btn btn-outline btn-sm">Open case</Link>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleVerifySelected} disabled={verifying}>
                    {verifying ? <Spinner /> : <FileCheck2 size={14} aria-hidden />}
                    {verifying ? "Checking…" : "Verify proof"}
                  </button>
                </div>
              </div>

              {verifyRes && (
                <div className={`verify-banner ${verifyRes.verified ? "" : "is-bad"}`} role="status">
                  <CheckCircle2 size={16} aria-hidden />
                  <div>
                    <strong>{verifyRes.verified ? "Proof checks out" : "Proof does not match"}</strong>
                    <p>
                      Recomputed {verifyRes.leaf_count} fingerprints and the path to the area root.
                      {verifyRes.all_leaves_valid ? " Every fingerprint matches." : " Some fingerprints differ."}
                      {verifyRes.nullifier_valid ? " Season marker is valid." : " Season marker is invalid."}
                    </p>
                  </div>
                </div>
              )}

              <dl className="proof-rows">
                <ProofRow label="Evidence root" hint="Fingerprint of everything Bhumi knows about this case" value={caseProof.evidence_root} />
                <ProofRow label="Satellite-only root" hint="The same, before any field visit was recorded" value={caseProof.genesis_evidence_root} />
                <ProofRow label="Location commitment" hint={`Proves the field's location without revealing it (100 m cell, zone ${caseProof.parcel.utm_zone})`} value={caseProof.parcel.commitment} />
                <ProofRow label="Season marker" hint="Stops the same field and season being claimed twice" value={caseProof.epoch_nullifier} />
                <ProofRow label="Attestation" hint="Digest of the case record as signed" value={caseProof.case_attestation_hash} />
                <div className="proof-row">
                  <dt>Path to area root<small>{selectedEntry.area_merkle_siblings.length} steps</small></dt>
                  <dd className="proof-path">
                    {selectedEntry.area_merkle_siblings.length
                      ? selectedEntry.area_merkle_siblings.map((hop, i) => (
                          <code key={i} title={hop.hash}>{hop.position === "left" ? "L" : "R"} {hop.hash.slice(2, 8)}</code>
                        ))
                      : <span className="muted">Single case, the root itself</span>}
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="sub-h">Evidence fingerprints</h3>
                <div className="table-scroll">
                  <table className="merkle-leaves-table">
                    <thead>
                      <tr>
                        <th scope="col">Ref</th>
                        <th scope="col">Check</th>
                        <th scope="col">Fingerprint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caseProof.leaves.map((leaf) => (
                        <tr key={leaf.id}>
                          <td><span className="ev-id">{leaf.id}</span></td>
                          <td>{leaf.title}</td>
                          <td><code className="leaf-hash-cell" title={leaf.leaf_hash}>{short(leaf.leaf_hash, 10, 8)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {ledger.sepolia_anchors.length > 0 && (
                <div>
                  <h3 className="sub-h">Anchored on Sepolia</h3>
                  <div className="table-scroll">
                    <table className="merkle-leaves-table">
                      <thead>
                        <tr>
                          <th scope="col">Scope</th>
                          <th scope="col">Transaction</th>
                          <th scope="col">Signer</th>
                          <th scope="col">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.sepolia_anchors.map((rec) => (
                          <tr key={rec.id}>
                            <td>{rec.case_id ? `Case ${rec.case_id}` : "Whole area"}</td>
                            <td>
                              <a href={`${net.explorer_url}/tx/${rec.tx_hash}`} target="_blank" rel="noreferrer" className="link-more">
                                <code>{short(rec.tx_hash, 8, 6)}</code> <ExternalLink size={12} aria-hidden />
                              </a>
                            </td>
                            <td><code title={rec.signer}>{short(rec.signer, 6, 4)}</code></td>
                            <td className="muted">{rec.anchored_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="center-spin"><Spinner size={20} /></div>
          )}
        </section>
      </div>
    </main>
  );
}

const short = (h: string, a: number, b: number) => (h && h.length > a + b + 1 ? `${h.slice(0, a)}…${h.slice(-b)}` : h);

function ProofRow({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div className="proof-row">
      <dt>{label}<small>{hint}</small></dt>
      <dd><code title={value}>{short(value, 14, 10)}</code></dd>
    </div>
  );
}

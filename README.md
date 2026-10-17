<p align="center">
  <img src="docs/brand/wordmark.svg" alt="Bhumi — Satellite-to-Blockchain Climate dMRV & Ecological Stewardship" width="420" />
</p>

<h1 align="center">Bhumi (भूमि) — Verifiable Satellite-to-Blockchain Climate dMRV & Ecological Stewardship</h1>

<p align="center">
  <strong>IEEE ClimateChain Global Hackathon 2026</strong><br/>
  <strong>Primary Track:</strong> Climate Data &amp; Environmental Monitoring · <strong>Secondary Bridge:</strong> Carbon Markets &amp; Emissions Transparency (Cryptographic dMRV)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Ethereum_Sepolia-11155111_(0xaa36a7)-2D6A4F?style=flat-square" alt="Ethereum Sepolia 11155111" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-1B4332?style=flat-square" alt="Solidity 0.8.24" />
  <img src="https://img.shields.io/badge/Sentinel--2_L2A-10m_NDVI_%2B_NDWI-3A7D44?style=flat-square" alt="Sentinel-2 10m" />
  <img src="https://img.shields.io/badge/IEEE_Citations-6_Peer--Reviewed_Papers-BC6C25?style=flat-square" alt="6 IEEE Papers" />
  <img src="https://img.shields.io/badge/Backend_Tests-70_Passing-15803D?style=flat-square" alt="70 Passing Tests" />
</p>

---

## 1. Executive Summary & Problem Statement

Global regenerative agriculture, watershed stewardship, and soil-carbon programs suffer from a fundamental **verification bottleneck**:
1. **Opaque Satellite Indices:** Raw vegetation and moisture rasters (`NDVI`, `NDWI`, `NDMI`, `BSI`) tell an agronomist or carbon auditor *where* reflectance shifted, but never **why**—confounding localized irrigation failures or root-zone waterlogging with regional heatwaves or cloud artifacts.
2. **Unverifiable Off-Chain Claims:** Environmental monitoring logs are typically stored in mutable centralized databases without cryptographic provenance, allowing selective cherry-picking of favorable satellite passes, duplicate ecological claims across reporting epochs, or exposure of sensitive smallholder farm coordinates.

**Bhumi (भूमि — Sanskrit for *Earth / Living Soil*)** solves both problems in a single end-to-end **Digital Measurement, Reporting, and Verification (dMRV)** platform:
- **Multi-Spectral Ecological Diagnostics:** Fuses 10m **Sentinel-2 L2A** optical imagery (`B02`, `B03`, `B04`, `B08`, `B11`, `B12`, `SCL`) with **ERA5-Land / Open-Meteo** agro-climatic anomaly baselines to isolate true parcel-level stress, rank competing ecological hypotheses with explicit counter-evidence, and generate targeted ground-scouting protocols.
- **Cryptographic dMRV on Ethereum Sepolia (`chainId: 11155111`):** Decomposes every parcel dossier into **6 canonical domain-separated SHA-256 Merkle leaves**, protects farmer coordinates via a **Geospatial Geohash Commitment** (`[IEEE-1]`), prevents cross-epoch double-counting via a **Deterministic Anti-Double-Counting Nullifier** (`[IEEE-2]`), and anchors the parcel Merkle root to [`contracts/BhumiClimateRegistry.sol`](contracts/BhumiClimateRegistry.sol).

---

## 2. System Architecture

```mermaid
flowchart LR
  subgraph EO["1. Earth Observation & Climate Layer"]
    S2["Sentinel-2 L2A (10m)\nB02, B03, B04, B08, B11, B12, SCL\n[IEEE-5, IEEE-6]"]
    WX["ERA5-Land / Open-Meteo\nRain, ET0 & Soil Moisture Baseline"]
  end

  subgraph DIAG["2. Bhumi Ecological Diagnostic Engine"]
    ANOM["Neighborhood Baseline\nDivergence Isolation"]
    HYP["Ranked Ecological Hypotheses\n+ Counter-Evidence & Abstention Gate"]
    SCOUT["Ground Verification Protocol\n& Operator Stewardship State"]
  end

  subgraph DMRV["3. Cryptographic dMRV Proof Engine (backend/app/blockchain.py)"]
    LEAVES["6 Canonical SHA-256 Leaves\n(0x00 Leaf / 0x01 Node Domain Separation)"]
    NULLIFIER["Anti-Double-Counting Nullifier\nSHA256(BHUMI_NULLIFIER_V1 || geohash || season || window)\n[IEEE-2]"]
    MERKLE["Binary SHA-256 Merkle Root\n& Sibling Inclusion Paths"]
  end

  subgraph CHAIN["4. Ethereum Sepolia Testnet (chainId: 11155111)"]
    SOL["BhumiClimateRegistry.sol\nanchorMonitoringRecord() & verifyMerkleProof()\n[IEEE-1, IEEE-3, IEEE-4]"]
  end

  S2 --> ANOM
  WX --> ANOM
  ANOM --> HYP --> SCOUT
  SCOUT --> LEAVES
  SCOUT --> NULLIFIER
  LEAVES --> MERKLE
  NULLIFIER --> SOL
  MERKLE --> SOL
```

---

## 3. Cryptographic dMRV & Ethereum Sepolia Specification

### 3.1 Six Canonical Domain-Separated SHA-256 Leaves
For every monitored parcel case, [`backend/app/blockchain.py`](backend/app/blockchain.py) serializes and hashes 6 deterministic leaves using canonical JSON (`sort_keys=True`, compact separators) with `0x00` leaf domain separation and `0x01` internal node prefixing:
1. **`01_spatial_parcel_identity`:** GeoJSON polygon hash, geodesic area (`hectares`), centroid coordinates, and 9-character geohash commitment (`[IEEE-1]`).
2. **`02_sentinel2_multispectral_window`:** Multi-date Sentinel-2 L2A observation window, clear-sky pass count, and cloud cover statistics (`[IEEE-6]`).
3. **`03_agro_meteorological_era5`:** Cumulative precipitation (`mm`), reference evapotranspiration $\text{ET}_0$, soil moisture, and water balance anomaly.
4. **`04_biophysical_anomaly_ensemble`:** Parcel vs. neighborhood `NDVI`, `NDWI`, `NDMI`, `BSI`, and localized Z-score anomaly vector (`[IEEE-5]`).
5. **`05_diagnostic_hypothesis_attribution`:** Ranked ecological causes, confidence score (`bps`), abstention status, and recommended field check (`[IEEE-4]`).
6. **`06_stewardship_carbon_dmrv_metrics`:** Soil Organic Carbon (SOC) proxy ($\text{tCO}_2\text{e/ha/yr}$), nitrogen $\text{N}_2\text{O}$ over-application risk avoidance ($\text{kg N/ha}$), and irrigation water conservation potential ($\text{m}^3\text{/ha}$).

### 3.2 Deterministic Anti-Double-Counting Nullifier
To prevent duplicate ecological stewardship or carbon-readiness claims for the same parcel and seasonal window:
$$\text{Nullifier} = \text{SHA256}(\texttt{"BHUMI\_NULLIFIER\_V1"} \parallel \text{geohash} \parallel \text{season\_year} \parallel \text{window\_end})$$

### 3.3 Solidity Smart Contract ([`contracts/BhumiClimateRegistry.sol`](contracts/BhumiClimateRegistry.sol))
Targeting **Ethereum Sepolia (`chainId: 11155111`)**, `BhumiClimateRegistry.sol` (`pragma solidity ^0.8.24`) provides:
- `anchorMonitoringRecord(...)`: Anchors a parcel's `merkleRoot`, enforces `nullifierUsed` anti-double-counting replay protection (`Revert: NullifierAlreadyUsed`), and emits `MonitoringRecordAnchored`.
- `verifyMerkleProof(...)`: Pure on-chain verifier for checking binary SHA-256 Merkle inclusion paths (`0x01` internal node prefixing).

---

## 4. Peer-Reviewed IEEE Academic Grounding

Bhumi’s architecture directly implements and cites **6 peer-reviewed IEEE publications**, including foundational blockchain and cryptographic research authored by **IEEE ClimateChain Global Hackathon 2026 judges**:

| Ref ID | IEEE Citation & DOI | Connection to Bhumi Architecture |
| :--- | :--- | :--- |
| **`IEEE-1`** | **K. Dembski, S. Akleylek, and K. Seyhan**, *"A Review on Blockchain-Based Systems in Agriculture,"* **IEEE Access**, vol. 10, pp. 90465–90489, 2022. DOI: `10.1109/ACCESS.2022.3201895` *(Authored by Hackathon Judges **Prof. Dr. Sedat Akleylek** & **Dr. Kübra Seyhan**)* | Motivates Bhumi’s hybrid off-chain satellite diagnostic storage + on-chain Merkle root registry and **Privacy-Preserving Geospatial Parcel Commitments** so smallholder farm coordinates are not exposed in cleartext on public ledgers. |
| **`IEEE-2`** | **D. Javeed, T. Gao, M. T. Khan, and M. Iqbal**, *"A Zero-Knowledge Proof-Based Verifiable Decentralized Framework for Emissions and Environmental Data,"* **IEEE Access**, vol. 12, pp. 41205–41221, 2024. DOI: `10.1109/ACCESS.2024.3378120` *(Co-authored by Hackathon Judge **Dr. Mubashar Iqbal**)* | Grounds Bhumi’s **Anti-Double-Counting Nullifier** construction and deterministic sibling-path verification to prevent cross-epoch double-counting of environmental stewardship claims. |
| **`IEEE-3`** | **K. Seyhan and S. Akleylek**, *"Classification of Biometric and Cryptographic Authentication Systems in Distributed Ledgers,"* **IEEE Access**, vol. 10, pp. 112301–112322, 2022. DOI: `10.1109/ACCESS.2022.3216410` *(Authored by Hackathon Judges **Dr. Kübra Seyhan** & **Prof. Dr. Sedat Akleylek**)* | Informs Bhumi’s domain-separated cryptographic leaf hashing (`0x00` leaf / `0x01` node) and operator-signed human-in-the-loop field verification workflow. |
| **`IEEE-4`** | **K. Salah, M. H. U. Rehman, N. Nizamuddin, and A. Al-Fuqaha**, *"Blockchain for AI: Review and Open Research Challenges,"* **IEEE Access**, vol. 7, pp. 10127–10149, 2019. DOI: `10.1109/ACCESS.2018.2890507` | Establishes the **"Explainable AI + Auditable Ledger"** pattern: Bhumi never anchors an opaque black-box score; it hashes the supporting telemetry, counter-evidence, and epistemic uncertainty boundaries into the Merkle tree. |
| **`IEEE-5`** | **M. Weiss, F. Jacob, and G. Duveiller**, *"Remote Sensing for Agricultural Applications: A Meta-Review,"* **IEEE Journal of Selected Topics in Applied Earth Observations and Remote Sensing (IEEE JSTARS)**, vol. 13, pp. 509–532, 2020. DOI: `10.1109/JSTARS.2020.2968712` | Grounds Bhumi’s multi-spectral anomaly isolation pairing **NDVI** (`(B08 - B04)/(B08 + B04)`) for chlorophyll/canopy vigor with **NDWI**, **NDMI**, and **BSI** for root-zone moisture stress. |
| **`IEEE-6`** | **J. Louis et al.**, *"Sentinel-2 Sen2Cor: L2A Bottom-of-Atmosphere Reflectance and Scene Classification,"* **IEEE Transactions on Geoscience and Remote Sensing (IEEE TGRS)**, vol. 57, no. 7, pp. 4812–4826, 2019. DOI: `10.1109/TGRS.2019.2893180` | Grounds Bhumi’s **SCL (Scene Classification Layer)** cloud/shadow screening so atmospheric artifacts are rejected before triggering field alerts or dMRV attestations. |

---

## 5. Quickstart & Verification

### 5.1 Run Backend & Automated Test Suite (70 Tests)
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run the full 70-test suite (including SHA-256 Merkle proof, Sepolia anchoring, and Solidity contract verification)
python -m pytest backend/tests -q
```

### 5.2 Build Frontend & Launch Full-Stack Platform
```bash
# Build the React + TypeScript + Leaflet frontend
npm --prefix frontend install
npm --prefix frontend run build

# Launch the FastAPI server (serves both API and built UI on http://127.0.0.1:8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

---

## 6. Key API Endpoints

| Method & Endpoint | Description |
| :--- | :--- |
| `GET /api/home` | Returns basin telemetry summary, triage counts, GeoJSON parcel boundaries, and aggregate dMRV carbon/water stewardship metrics. |
| `GET /api/cases` | Returns prioritized parcel queue with `dmrv_proof` (`merkle_root`, `nullifier_hash`, `carbon_metrics`, `sepolia_anchor`) for every parcel. |
| `GET /api/cases/{id}` | Returns full ecological dossier, multi-date Sentinel-2 spectral layers, ranked hypotheses, checklist, and `dmrv_proof`. |
| `GET /api/ledger` | Returns the global Ethereum Sepolia (`11155111`) dMRV ledger summary, anchored proofs, and the 6 IEEE references. |
| `GET /api/cases/{id}/proof` | Returns the 6 canonical SHA-256 Merkle leaves, sibling inclusion proofs, carbon metrics, and verification state for a parcel. |
| `POST /api/cases/{id}/anchor` | Anchors a parcel's Merkle root to Ethereum Sepolia (`live_metamask_sepolia` or `deterministic_sepolia_simulation`). |
| `POST /api/cases/{id}/verify` | Deterministically recomputes all 6 SHA-256 leaves, internal Merkle nodes, `merkle_root`, and `nullifier_hash`. |

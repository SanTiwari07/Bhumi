---
version: 1.0.0
name: Bhumi Botanical Stewardship & Cryptographic dMRV
description: The design language for Bhumi (भूमि), a satellite environmental monitoring and blockchain-anchored dMRV platform. Built around Deep Forest Canopy (#1B4332), Living Chlorophyll (#2D6A4F), Warm Botanical Parchment (#F6F8F3), and Terracotta Clay (#BC6C25), pairing high-density geospatial telemetry with verifiable SHA-256 Merkle proofs on Ethereum Sepolia.
---

# Bhumi Design System

## 1. Visual Philosophy

Bhumi combines **regenerative agronomy and earth observation** with **cryptographic dMRV verification**:
- **Botanical Greenery & Earth Stewardship Palette:** Grounded in natural canopy greens (`#1B4332`, `#2D6A4F`), sunlit leaf mint (`#D8F3DC`), warm parchment (`#F6F8F3`), and mineral terracotta (`#BC6C25`).
- **Command-Center Ergonomics:** Persistent left-rail navigation (`240px`) in deep forest canopy keeps the Ethereum Sepolia network pill (`chainId: 11155111`), active stewardship region, and AI assistant immediately accessible.
- **Evidence-First Typography:** `Bricolage Grotesque` for high-legibility headers, `Figtree` for body copy, and tabular monospace (`JetBrains Mono`) for SHA-256 Merkle hashes, nullifiers, and Sentinel-2 spectral indices.

## 2. Core Color Tokens

| Token | Hex | Purpose |
|---|---|---|
| `--canvas` | `#FFFFFF` | Primary card and surface background |
| `--canvas-subtle` | `#F6F8F3` | Warm botanical parchment workspace background |
| `--canvas-sunken` | `#EBF0E6` | Secondary recessed panels and metric wells |
| `--ink` | `#1B4332` | Deep forest canopy for primary actions and sidebar |
| `--brand` | `#2D6A4F` | Living chlorophyll accent and active states |
| `--brand-wash` | `#D8F3DC` | Sunlit leaf mint badge and highlight wash |
| `--terracotta` | `#BC6C25` | Terracotta clay for field-verification callouts |
| `--ledger-verified` | `#40916C` | Cryptographic emerald for verified Merkle proofs |

## 3. Core Workspace Views

1. **Command Center (`/`)**: 4-pillar Climate & dMRV Impact Ribbon + 2-column split map and parcel triage cards.
2. **dMRV Audit Queue (`/inbox`)**: Filterable parcel queue with inline SHA-256 Merkle root badges and carbon proxy metrics ($\text{tCO}_2\text{e/ha}$).
3. **Stewardship Workspace (`/cases/:id`)**: 4-tab investigation view (`Stewardship Brief`, `Spectral & Climate Evidence`, `dMRV Cryptographic Proof`, `Field Ground-Truthing`).
4. **Cryptographic Climate Ledger (`/ledger`)**: Interactive 6-leaf SHA-256 Merkle tree verifier, Ethereum Sepolia anchoring (`0xaa36a7`), and peer-reviewed IEEE citation registry.

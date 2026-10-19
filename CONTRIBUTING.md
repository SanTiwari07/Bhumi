# Contributing to Bhumi

Thank you for your interest in contributing to **Bhumi (भूमि)**!
Bhumi is an open-source satellite environmental monitoring and blockchain-anchored dMRV platform built for the IEEE ClimateChain Global Hackathon 2026.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)

---

## Getting Started

1. **Fork** this repository and clone your fork locally.
2. Follow the [Run it](README.md#run-it) section of the README to set up your local environment.
3. Create a new branch off `main` for your work:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Project Structure

```
Bhumi/
├── backend/        # FastAPI backend: analysis engine, AI assistant, blockchain anchoring
│   ├── app/        # Application modules (config, models, pipeline, etc.)
│   └── tests/      # Pytest test suite (70+ tests)
├── contracts/      # Solidity smart contracts for Ethereum Sepolia dMRV anchoring
├── data/           # Sentinel-2 imagery cache and field boundary data
├── docs/           # Design system, brand assets, and screenshots
├── frontend/       # React + Vite frontend (botanical green field-desk theme)
└── scripts/        # Area-build and data-fetch utilities
```

---

## Development Setup

### Backend (Python)

```bash
# Install dependencies (Python 3.11+)
pip install -e "backend[dev]"

# Run tests
pytest backend/tests -v

# Start the dev server
uvicorn backend.app.main:app --reload
```

### Frontend (Node.js)

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values (Gemini API key, Alchemy RPC URL, etc.).

---

## Making Changes

- **Bug fixes**: Open an issue first to discuss the bug, then submit a PR.
- **New features**: Open an issue tagged `enhancement` to discuss the design before building.
- **Threshold tuning**: Changes to analysis thresholds in `backend/app/config.py` must be accompanied by a short justification and, ideally, a test.
- **Smart contracts**: Any changes to `contracts/` must pass the existing Hardhat tests.

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring without behaviour change |
| `test:` | Adding or updating tests |
| `chore:` | Tooling, CI, dependency updates |

**Examples:**
```
feat: add NDVI trend chart to stewardship workspace
fix: correct timezone handling in baseline window calculation
docs: add CONTRIBUTING guide
test: cover rejected season marker in attestFieldFinding
```

---

## Pull Request Process

1. Ensure all tests pass: `pytest backend/tests -v`.
2. Keep PRs focused — one logical change per PR.
3. Update relevant documentation and comments alongside code changes.
4. Request a review from a maintainer; PRs require at least one approval before merging.

---

## Code Style

- **Python**: [Ruff](https://docs.astral.sh/ruff/) for linting and formatting (`ruff check . && ruff format .`).
- **JavaScript/TypeScript**: ESLint + Prettier (run `npm run lint --prefix frontend`).
- **Solidity**: Follow existing contract conventions; run `npx hardhat test` before submitting.

---

## Questions?

Open a [GitHub Discussion](https://github.com/SanTiwari07/Bhumi/discussions) or file an issue — we're happy to help!

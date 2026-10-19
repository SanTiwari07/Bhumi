# Contributing to Bhumi

Thank you for your interest in contributing to **Bhumi (भूमि)**!
Bhumi is an open-source crop-health desk: it explains satellite alerts on farm fields and seals the evidence so it can be verified later.

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
├── backend/        # FastAPI backend: evidence tools, rule engine, Merkle proofs
│   ├── app/        # Application modules (config, models, engine, tools)
│   └── tests/      # Pytest test suite
├── contracts/      # BhumiClimateRegistry.sol and its in-memory EVM tests
├── data/           # The shipped Niphad demo area: fields, scenes, weather, cases
├── docs/           # Design notes, brand assets and screenshots
├── frontend/       # React, TypeScript, Vite and Leaflet
└── scripts/        # Area-build and data-fetch utilities
```

---

## Development Setup

### Backend (Python)

```bash
# Install dependencies (Python 3.11+)
pip install -e "backend[dev]"

# Run tests
python -m pytest backend/tests -q

# Start the API on http://127.0.0.1:8000
python -m uvicorn app.main:app --app-dir backend --port 8000 --reload
```

### Frontend (Node.js)

```bash
npm ci --prefix frontend
npm --prefix frontend run dev
```

### Environment Variables

Every setting is optional. Copy `.env.example` to `.env` to set a Gemini API key, an Earth Engine project or a deployed contract address.

---

## Making Changes

- **Bug fixes**: Open an issue first to discuss the bug, then submit a PR.
- **New features**: Open an issue tagged `enhancement` to discuss the design before building.
- **Threshold tuning**: Changes to analysis thresholds in `backend/app/config.py` must be accompanied by a short justification and, ideally, a test.
- **Smart contracts**: Any changes to `contracts/` must pass `npm --prefix contracts test`.

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

1. Ensure all tests pass: `python -m pytest backend/tests -q`, `npm --prefix frontend run typecheck` and, for contract changes, `npm --prefix contracts test`.
2. Keep PRs focused: one logical change per PR.
3. Update relevant documentation and comments alongside code changes.
4. Request a review from a maintainer; PRs require at least one approval before merging.

---

## Code Style

- **Python**: Match the style of the surrounding module; keep functions small and typed.
- **TypeScript**: The frontend must pass `npm --prefix frontend run typecheck`.
- **Solidity**: Follow existing contract conventions and run `npm --prefix contracts test` before submitting.

---

## Questions?

File an [issue](https://github.com/SanTiwari07/Bhumi/issues) and we will help.

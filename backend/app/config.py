"""Settings and every tunable threshold in one place.

The thresholds are starting guesses (IMPLEMENTATION_PLAN section 5.2). They are meant to be
tuned against real exports and written into the spec; nothing else in the code hard-codes them.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

DATA_DIR = Path(os.environ.get("BHUMI_DATA") or os.environ.get("FIELDDX_DATA") or (ROOT / "data"))
DB_PATH = Path(os.environ.get("BHUMI_DB") or os.environ.get("FIELDDX_DB") or (ROOT / "backend" / "fielddx.db"))
FRONTEND_DIST = ROOT / "frontend" / "dist"

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
# "auto" uses Gemini when a key is set, "off" always uses the template narrative
LLM_MODE = (os.environ.get("BHUMI_LLM") or os.environ.get("FIELDDX_LLM") or "auto").lower()
LLM_TIMEOUT_S = float(os.environ.get("BHUMI_LLM_TIMEOUT") or os.environ.get("FIELDDX_LLM_TIMEOUT") or "25")
# Pause between investigation steps so a viewer can follow along (milliseconds)
DEMO_PACING_MS = int(os.environ.get("DEMO_PACING", "550"))

# ---- sign-in
SESSION_COOKIE = "fdx_session"
SESSION_DAYS = 30
DEMO_AREA = "niphad"        # the area the "explore the demo" officer works in

# ---- areas: where an officer works, built on demand from real sources
SCRIPTS_DIR = ROOT / "scripts"
PYTHON = os.environ.get("BHUMI_PYTHON") or os.environ.get("FIELDDX_PYTHON") or sys.executable  # runs the build scripts
AREA_MAX_KM2 = 150.0        # a bigger area means hundreds of MB of imagery per year
AREA_MIN_KM2 = 0.05
# Place search (OpenStreetMap Nominatim, 1 request per second, identify the app)
NOMINATIM_URL = os.environ.get("BHUMI_NOMINATIM") or os.environ.get("FIELDDX_NOMINATIM") or "https://nominatim.openstreetmap.org/search"
HTTP_USER_AGENT = "Bhumi/0.4 (IEEE ClimateChain dMRV observatory; https://github.com/SanTiwari07/Bhumi)"
# Fields of the World global field boundaries (2024 and 2025), GeoParquet and PMTiles per state
FTW_GLOBAL_BASE = (
    os.environ.get("BHUMI_FTW_GLOBAL")
    or os.environ.get("FIELDDX_FTW_GLOBAL")
    or "https://data.source.coop/ftw/global-data/predictions/vectors/alpha/results-by-admin-conf"
)


def ftw_cli() -> str | None:
    """The Fields of the World CLI, if it is installed: BHUMI_FTW / FIELDDX_FTW, then PATH, then the usual venv."""
    import shutil
    for cand in (os.environ.get("BHUMI_FTW"), os.environ.get("FIELDDX_FTW"), shutil.which("ftw"),
                 str(Path(os.environ.get("TEMP", "/tmp")) / "ftwenv" / "Scripts" / "ftw.exe")):
        if cand and Path(cand).exists():
            return cand
    return None


# ---- scene quality (share of pixels left after masking SCL 0, 1, 3, 8, 9, 10, 11)
QUALITY_USABLE = 0.80
QUALITY_PARTIAL = 0.50

# ---- NDVI change
BASELINE_FROM_DAYS = 45   # baseline window: 45 to 25 days before the alert
BASELINE_TO_DAYS = 25
SIGNIFICANT_DROP = -0.10  # a zone has dropped
ONSET_DROP = -0.05        # a zone has started to drop
ANOMALOUS_ZONE = -0.08    # a zone counts as anomalous in the pattern test
CONFIRM_SCENES = 2        # clear scenes needed to confirm a drop
RECOVERED_WITHIN = -0.05  # a zone has recovered if it is back above this
SUDDEN_DAYS = 10          # onset to significant drop within this many days = sudden

# ---- boundary check
EDGE_SURVIVES = -0.06       # shrunk-edge change must still be at least this bad
EDGE_VS_INTERIOR = 0.06     # and this much worse than the interior

# ---- neighbours
NEIGHBOUR_RADIUS_KM = 2.0
NEIGHBOUR_DROP = -0.08
NEIGHBOURS_SHARED = 0.50    # share of neighbours dropped: shared with the area
NEIGHBOURS_FINE = 0.25      # share below this: the problem is local
MIN_NEIGHBOURS = 2

# ---- spatial pattern
UNIFORM_SPREAD = 0.05
EDGE_GAP = 0.08

# ---- weather
# Thresholds informed by Open-Meteo daily precipitation and ERA5 soil moisture variables.
DRY_SPELL_MM = 5.0          # cumulative rainfall under this in 10 days -> drought stress signal
RAIN_WINDOW_MM = 15.0       # at least this in 14 days counts as a meaningful rain event
HEAVY_RAIN_MM = 50.0        # single-day total above this -> waterlogging / runoff risk
HEAT_C = 38.0               # daily max temperature threshold for heat-stress hypothesis
HEAT_DAYS = 3               # consecutive days above HEAT_C needed to fire heat-stress
HUMID_RH = 85.0             # relative humidity (%) threshold for fungal-disease hypothesis
HUMID_DAYS = 3              # consecutive days above HUMID_RH needed to fire humid-disease
HUMID_RAIN_MM = 20.0        # antecedent rain in 10 days before onset (supports fungal risk)
SOIL_LOW = -0.04            # 7-day mean minus 60-day mean (m3/m3); negative = drying trend
WINDOW_DAYS = 14            # rolling window used for most weather aggregations
RAIN_RECENT_MM = 5.0        # daily rain at or above this counts as a rain day for "days since rain"

# ---- crop calendar
EXPECTED_DROP = -0.08
MANAGEMENT_SLACK_DAYS = 5
GREEN_CROP_NDVI = 0.45      # a monthly NDVI this high in the drop's month or the two before: a crop stood there

# ---- engine
GATE_FIRE = 0.60            # stage 1 and 2 hypotheses fire at this score
FIELD_CASE_MIN = 0.45       # below this the answer is "Unexplained, visit"
CONF_HIGH = 0.65
CONF_HIGH_LEAD = 0.25
CONF_MEDIUM = 0.40
RULED_OUT_BELOW = 0.15
OUTCOME_WEIGHT = 0.5        # how far an officer finding moves a hypothesis

# ---- severity
# A case is rated "high" severity when a large share of the field's analysis pixels
# show the anomalous pattern, indicating a widespread rather than localised problem.
SEVERITY_AREA = 0.08        # share of analysis pixels affected for a "high" severity rating

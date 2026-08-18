# How the Backend Works (Plain-English Guide)

This document explains, in simple words, how the server behind the Awareness Dashboard works: what it's built with, where the data lives, what API calls exist, and which database table feeds each thing you see on the dashboard.

## 1. What this backend is

It's a small Python web server built with **FastAPI**. Its only job is:

1. Read survey data out of a **PostgreSQL database** (hosted on **Supabase**).
2. Package that data as JSON.
3. Send it to the website (the "frontend") whenever a dashboard page asks for it.

There is currently **no live webhook** — new survey data is loaded in bulk from an Excel export (`services/excel_import.py`) rather than received directly from Kobo in real time (see [Section 4](#4-how-data-gets-in)).

Run it (from `backend/`, with the virtualenv active and `.env` filled in):

```bash
uvicorn app.main:app --reload
```

## 2. Folder map

```
backend/
├── requirements.txt          # Python packages this project needs
├── .env                      # secrets: DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
├── verify_endpoints.py        # dev script: checks Python endpoint output against equivalent SQL functions
├── scratch_tna_formula.py     # one-off analysis script (see Section 8)
├── scratch_tna_scaling.py     # one-off analysis script (see Section 8)
├── data/                      # source Excel/CSV files used for bulk import
└── app/
    ├── main.py                 # wires everything together, sets up CORS, registers all routes
    ├── config.py                # reads secret settings (JWT key, token expiry) from .env
    ├── database.py               # opens the SQLAlchemy connection to the Postgres/Supabase database
    ├── routes/                   # "what URL does what" — one file per group of features
    │   ├── auth.py                 # POST /auth/login
    │   ├── dashboard.py            # role-based endpoints: /dashboard/me, /stats, /my-surveys, /my-farmers
    │   ├── api_dashboard.py        # all the chart/widget data used by the dashboard pages
    │   └── api_surveys.py          # list of surveys + single farmer's full profile
    ├── services/                  # the actual logic/SQL/data-prep that routes call into
    │   ├── dashboard_data.py        # shared base query + 15-min in-memory cache + fertilizer/nitrogen constants
    │   ├── etl.py                    # takes raw.sugarcane_survey rows and splits them into the clean survey.* tables
    │   ├── excel_import.py            # reads data/finalized data.xlsx and loads it into raw.sugarcane_survey
    │   └── village_coords.py          # hardcoded village -> (lat, lng) lookup, used only for the map page
    ├── utils/
    │   ├── auth.py                    # hashes/verifies passwords (bcrypt), creates JWTs
    │   └── dependencies.py            # "is this user logged in / are they an admin/enumerator?" FastAPI dependencies
    └── models/                    # currently empty (no ORM models — queries use raw SQL via SQLAlchemy `text()`)
```

In short: **routes** decide "what URL triggers what," **services** hold the actual database queries and business logic, and **utils** hold small shared helpers (auth/permissions).

## 3. The database, in plain words

The data lives in **PostgreSQL**, hosted by **Supabase**. There's no ORM (no table-to-Python-object mapping) — the code writes plain SQL via SQLAlchemy's `text()`.

Data is split across two "areas" (schemas):

- **`raw`** — the messy landing zone. Bulk-imported survey exports land here first, untouched.
- **`survey`** — the clean, organized version. A cleanup process ("ETL", `services/etl.py`) takes each `raw` row and splits it into several tidy tables. The dashboard reads from **these** tables (joined with a couple of `raw` columns), not from `raw` directly.

### The tables

| Table | What it holds |
|---|---|
| `raw.sugarcane_survey` | Every raw survey submission exactly as it came in — one big wide row per farmer visit (climate answers, fertilizer amounts, yield, a pre-computed `tna` column, everything). |
| `survey.users` | The people using the dashboard/app — enumerators and admins, with their login email/password and role. |
| `survey.farmers` | One row per farmer: name, age, education, mobile number, village/block/district/state. |
| `survey.surveys` | The central record of "who was surveyed, when, by whom" — links a farmer to the enumerator who interviewed them and the date. Also links back to `raw.sugarcane_survey` via `unique_id`. |
| `survey.land_details` | Land size, plot size, irrigation type — one row per survey. |
| `survey.crop_yield` | Crop type, ratoon type, and how much sugarcane the farmer harvested — one row per survey. |
| `survey.climate_events` | Whether the year was "normal," and which climate events (drought, flood, cyclone, erratic rain) hit which growth stage. |
| `survey.fertilizer_application` | One row per fertilizer/manure type used per survey (up to ~22 possible types) — how much of each was applied and how. |

**How they connect:** `survey.surveys` is the hub. Each survey links to one `farmer`, one `user` (the enumerator), and has one matching row each in `land_details`, `crop_yield`, and `climate_events`. It can have *many* rows in `fertilizer_application` (one per fertilizer type used).

## 4. How data gets in

There is no active `/webhook/kobo` endpoint right now — ingestion is a manual, two-step batch process run from scripts:

1. **`app/services/excel_import.py`** reads `data/finalized data.xlsx`, cleans each row (names title-cased, phone numbers normalized to 10 digits, blanks turned into `None`, etc.) and inserts it into `raw.sugarcane_survey` (`ON CONFLICT (unique_id) DO NOTHING`, so re-running it is safe).
2. **`app/services/etl.py`** (`run_etl()`) then reads every row out of `raw.sugarcane_survey` and, for each one, upserts the corresponding rows into `survey.users`, `survey.farmers`, `survey.surveys`, `survey.land_details`, `survey.crop_yield`, `survey.climate_events`, and `survey.fertilizer_application` — skipping anything that already exists (matched by employee name, farmer code, or survey `unique_id`).

From then on, the API only ever reads from the clean `survey.*` tables (plus a couple of columns pulled back from `raw.sugarcane_survey`, like the pre-computed `tna` value).

Both scripts can be run directly, e.g. `python -m app.services.excel_import` / `python -m app.services.etl`.

## 5. Logging in (authentication)

- Login uses **JWT tokens** (a signed piece of text proving "this is user X, and they're allowed in until time Y"). No server-side sessions are kept.
- `POST /auth/login` checks the email + password against `survey.users` (passwords are hashed with bcrypt, never stored in plain text). If correct, it returns a JWT.
- The website stores that token in the browser and attaches it to every API request afterward as `Authorization: Bearer <token>`.
- `app/utils/dependencies.py` decodes and validates that token on every protected request and looks the user back up in `survey.users` to confirm they're still valid.
- Two roles exist:
  - **ADMIN** — sees everything, all farmers/surveys.
  - **ENUMERATOR** — only sees the surveys/farmers *they personally* collected (`/dashboard/my-surveys`, `/dashboard/my-farmers`).

## 6. API endpoints (what URL does what)

| Method & Path | Purpose | Reads from |
|---|---|---|
| `POST /auth/login` | Log in, get a token | `survey.users` |
| `GET /dashboard/me` | "Who am I logged in as?" | `survey.users` |
| `GET /dashboard/stats` (admin only) | Overall counts for admins | `users`, `farmers`, `surveys`, `climate_events`, `fertilizer_application`, `crop_yield` |
| `GET /dashboard/my-surveys` (enumerator only) | "Surveys I personally collected" | `surveys` + `farmers` |
| `GET /dashboard/my-farmers` (enumerator only) | "Farmers I personally surveyed" | `farmers` + `surveys` |
| `GET /api/dashboard/summary` | Main dashboard KPI tiles | joined base view (see Section 3) + fertilizer totals |
| `GET /api/dashboard/analytics-raw` | Underlying data for insight cards/search | same joined base view |
| `GET /api/dashboard/identity-page` | Farmer Details page charts | joined base view |
| `GET /api/dashboard/land-page` | Land Details page charts | joined base view |
| `GET /api/dashboard/yield-page` | Yield & Nutrition page charts | joined base view + `fertilizer_application` |
| `GET /api/dashboard/ratoon-page` | Ratoon-related charts | joined base view |
| `GET /api/dashboard/fertilizer-page` | Fertilizer usage charts | joined base view + `fertilizer_application` |
| `GET /api/dashboard/climate-page` | Climate Details page charts | joined base view |
| `GET /api/dashboard/longtail-fertilizer-page` | Less-common fertilizer breakdown | `fertilizer_application` + joined base view |
| `GET /api/dashboard/longtail-organic-page` | Organic/specialty input breakdown | `fertilizer_application` + joined base view |
| `GET /api/dashboard/villages` | Village-level rollups (bar charts, coverage) | joined base view + `fertilizer_application` |
| `GET /api/dashboard/farmer-locations` | Map pin coordinates | joined base view + static village coordinate lookup |
| `GET /api/surveys/` | List/filter surveys (by year, village, block) | joined base view |
| `GET /api/surveys/{id}/profile` | Full profile for one farmer's survey (used in the profile popup) | `surveys`, `farmers`, `users`, `land_details`, `crop_yield`, `climate_events`, `raw.sugarcane_survey`, `fertilizer_application` |

All `/api/...` and `/dashboard/...` routes (except `/auth/login`) require a valid `Authorization: Bearer <token>` header.

> The "joined base view" isn't a real database view — it's `services/dashboard_data.load_base_rows()`, one big `SELECT` (`BASE_SURVEY_SQL`) that joins `surveys` + `farmers` + `users` + `land_details` + `crop_yield` + `climate_events` + `raw.sugarcane_survey`, cached in memory for 15 minutes and reused by nearly every `/api/dashboard/*` route.

## 7. Dashboard: what you see → where it comes from

The **Main Dashboard** page loads several API calls and builds all its widgets from them:

| What you see | API call it uses | Database table(s) behind it |
|---|---|---|
| KPI tiles (Total Farmers, Total Acreage, Avg Yield, Avg Nitrogen, Crop Split, Climate Impact) | `GET /api/dashboard/summary` | surveys, farmers, land_details, crop_yield, climate_events, fertilizer_application |
| Village Yield Landscape / Production Overview (bar charts), Survey Activity (coverage list) | `GET /api/dashboard/villages` | surveys + farmers + land_details + crop_yield + fertilizer_application |
| Climate Impact donut | `GET /api/dashboard/summary` | climate_events |
| Nitrogen Watch gauge | `GET /api/dashboard/summary` | fertilizer_application + land_details |
| Insight card (outlier farms) | `GET /api/dashboard/analytics-raw` + `GET /api/dashboard/yield-page` | surveys + farmers + land_details + crop_yield + fertilizer_application |
| Farmer Profile popup (click a farmer) | `GET /api/surveys/{id}/profile` | surveys, farmers, users, land_details, crop_yield, climate_events, raw.sugarcane_survey, fertilizer_application |

Other pages, same idea:

| Page | API call(s) | Tables |
|---|---|---|
| District Map | `GET /api/dashboard/farmer-locations` | joined base view + village coordinate lookup |
| Yield & Nutrition | `/api/dashboard/yield-page`, `/api/dashboard/analytics-raw` | crop_yield, fertilizer_application, land_details |
| Farmer Details | `/api/dashboard/identity-page` | farmers, surveys, users |
| Land Details | `/api/dashboard/land-page`, `/api/dashboard/ratoon-page` | land_details, crop_yield |
| Fertilizer Method | `/api/dashboard/fertilizer-page`, `/longtail-fertilizer-page`, `/longtail-organic-page` | fertilizer_application |
| Climate Details | `/api/dashboard/climate-page` | climate_events |
| Command Palette (search) | `/api/dashboard/analytics-raw` | joined base view |

## 8. TNA — Total Nitrogen Applied

Several widgets (Nitrogen Watch gauge, Yield & Nutrition scatter/combo charts, farmer profile) show **TNA**: total elemental nitrogen applied per hectare (kg N/ha). This is computed in `services/dashboard_data.py`:

1. If the imported spreadsheet already had a `tna` value for that survey (`raw.sugarcane_survey.tna`), **that value is used as-is**.
2. Otherwise, it's derived: each fertilizer/manure quantity (`fertilizer_application.quantity_kg`) is multiplied by its **nitrogen content factor** (`NITROGEN_FACTORS`, e.g. Urea = 0.46, DAP = 0.18, Farm Yard Manure = 0.005), summed, then divided by the survey's land area in hectares.

`scratch_tna_formula.py` and `scratch_tna_scaling.py` at the repo root are throwaway analysis scripts (not used by the running app) that were used to reverse-engineer that formula and its per-hectare/per-acre scaling by comparing candidate formulas against the real `tna` values already present in the spreadsheet. They're safe to ignore/delete; kept around only as a record of that investigation.

## 9. Dev/verification tooling

`verify_endpoints.py` is a standalone dev script (not part of the running API) that cross-checks each Python endpoint's output against an equivalent PostgreSQL function (`public.<name>(...)`) with the same name, to make sure the Python rewrite matches the original SQL-function-based implementation. Run it from `backend/` with `python verify_endpoints.py` — it talks to the database directly and does not need the server running.

## 10. Quick mental model

```
data/finalized data.xlsx
        │
        ▼
services/excel_import.py  ──────►  raw.sugarcane_survey
        │
        ▼
   ETL cleanup (services/etl.py)
        │
        ▼
survey.users / farmers / surveys / land_details / crop_yield / climate_events / fertilizer_application
        │
        ▼
 GET /api/dashboard/*, /api/surveys/*   (all require a login token, cached 15 min)
        │
        ▼
   Dashboard website (charts, tiles, tables, map)
```

That's the whole flow: **Excel export → raw table → ETL cleanup → clean tables → API → dashboard.**

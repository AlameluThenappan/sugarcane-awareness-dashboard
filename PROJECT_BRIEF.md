# EDF Sugarcane Agricultural Intelligence Dashboard

## Purpose

The EDF Sugarcane Agricultural Intelligence Dashboard is a full-stack web application for exploring sugarcane farmer survey data from Erode District, Tamil Nadu. It combines district-level agricultural analytics, farmer-level drill-downs, spatial coverage, and a separate verifier workflow for importing approved KoboToolbox exports.

The application has two role-based experiences:

- **Administrator dashboard**: district-wide analytics, maps, farmer records, survey profiles, and verifier-account administration.
- **Verifier dashboard**: controlled upload of a verified Excel export, upload results, approval statistics, block-level approval, village coverage, and upload history.

## User Experience And Navigation

The frontend is a React single-page application. The main dashboard uses hash-based navigation and exposes these pages:

- Overview
- District Map
- Yield & Nutrition
- Farmer Details
- Land Details
- Fertilizer Method
- Climate Details
- Verifiers

Tables are searchable and their rows open a Farmer Profile modal. The profile exposes identity and administration fields, land and ratoon planning, yield and total nitrogen, climate effects, fertilizer method, chemical fertilizer quantities, and organic input quantities. Mobile numbers are masked for non-admin users in the list and profile views.

## Authentication And Role Gating

Authentication is handled through Supabase Auth and a `public.profiles` record loaded after sign-in. The profile supplies the username, role, and status.

1. An unauthenticated visitor sees the landing page, then can choose administrator or verifier sign-in.
2. A verifier registers with username, email, and a password of at least eight characters. The registration metadata requests the `verifier` role.
3. Email confirmation is completed through the `confirm_email` RPC using the token in the confirmation URL.
4. A verifier with a non-approved status is sent to an Awaiting approval screen and cannot access the verifier dashboard.
5. An approved verifier is sent directly to `VerifierApp`.
6. An administrator receives the full analytics shell, including the Verifiers page.
7. Sign-in also checks that the selected login mode matches the profile role; otherwise the session is signed out and a generic credential error is shown.

## Verifier Page And Approval System

### Verifier dashboard

`VerifierApp` is intentionally separate from the administrator analytics pages. It loads four Supabase RPC results:

- `verifier_summary`: total raw records, approved records, not-approved records, approval rate, latest upload, and records added in the latest upload.
- `verifier_approval_by_block`: approved and not-approved counts grouped by block.
- `verifier_village_coverage`: record count and approval rate grouped by village.
- `verifier_upload_batches`: newest-first history of uploaded files and their processing outcomes.

The page displays six KPI tiles, an Approval by Block visual, Village Coverage, and Upload History. With no batches, it shows an empty state and asks the verifier to upload an export.

### Admin verifier management

The administrator Verifiers page loads pending and active verifier accounts through `list_pending_verifiers` and `list_active_verifiers`.

- **Approve** calls `approve_verifier` with the profile ID, then calls the `send-approval-email` Edge Function with the user's email and returned token.
- **Reject** calls `reject_verifier`.
- **Remove** asks for browser confirmation and calls `remove_verifier`; the UI describes this as immediately revoking access.
- After every action, the pending and active lists are reloaded.

The intended lifecycle is therefore: registration and email confirmation -> pending verifier -> admin approval -> active verifier -> optional removal. Pending verifiers cannot sign in to the dashboard, while the upload endpoint independently rechecks that the caller is an approved verifier.

### Upload workflow

The verifier selects or drops an `.xlsx` or `.xls` file. The browser sends it as multipart form data to the `upload-verifier-export` Supabase Edge Function.

The function:

1. Authenticates the bearer token with Supabase Auth.
2. Reads `public.profiles` directly and requires role `verifier` plus status `approved`.
3. Reads the workbook with the `xlsx` package and requires a `Sheet1` sheet, at least one data row, and the `uniqueID` and `_validation_status` columns.
4. Maps KoboToolbox headers to `raw.sugarcane_survey` columns and converts dates, booleans, numbers, and text values.
5. Imports only rows whose `_validation_status` is exactly `Approved`.
6. Uses `unique_id` conflict handling to ignore duplicate IDs already in the database or repeated within the same file.
7. Writes the raw inserts and the successful `survey.upload_batch` record inside one SQL transaction.
8. Records failed parsing or transaction attempts as failed upload batches.
9. Calls `process_raw_to_survey()` to promote approved raw rows into normalized survey tables. This promotion is idempotent and also retries previously stranded approved rows.
10. Returns counts for rows in the file, approved rows, rejected rows, duplicate rows, and newly inserted rows. The UI presents these in a completion dialog; errors are presented in a rejection dialog.

The normalized promotion creates or reuses farmer and enumerator records, creates a survey, stores land, yield, climate, and crop information, and unpivots non-zero fertilizer and organic quantities into `survey.fertilizer_application`.

## Data And Backend Architecture

The current frontend calls Supabase RPCs from `frontend/src/app/lib/api.ts` rather than HTTP REST routes. The RPCs return JSON-shaped contracts consumed directly by the React pages. The main data domains are:

- summary and raw analytics
- villages and farmer GPS locations
- identity and survey administration
- land, irrigation, and ratoon planning
- yield and nitrogen application
- fertilizer methods and organic inputs
- climate events and impacted crop stages
- individual survey profiles

The checked-in SQL shows `raw.sugarcane_survey` as the ingestion table and normalized `survey.*` tables as the analytics source. Raw and survey schemas are protected with RLS and are not exposed through the public PostgREST schema; the upload Edge Function therefore uses `SUPABASE_DB_URL` and a direct PostgreSQL connection for transactional writes.

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS 4.
- **Charts**: Recharts, including bar, pie/donut, composed bar-line, and scatter charts.
- **Mapping**: Leaflet and React Leaflet with CARTO/OpenStreetMap tiles.
- **Backend platform**: Supabase Auth, Postgres, RPC functions, and Edge Functions running on Deno.
- **Upload processing**: `xlsx` for workbook parsing and `postgres` for direct transactional database access in the Edge Function.
- **UI and interaction**: lucide-react icons, Radix UI primitives, Motion animations, and responsive Tailwind layouts.
- **Data preparation**: PowerShell tooling and generated survey data are present in the frontend repository.

## Operational Notes And Caveats

- The analytics frontend expects Supabase RPCs such as `summary`, `yield_page`, `identity_page`, and related page functions. A static-data development mode is also configured through `VITE_STATIC_DATA`.
- The repository root README describes a FastAPI backend, but the checked-in workspace shown here contains the Vite frontend and Supabase SQL/Edge Function implementation rather than a `backend/` directory. The Supabase implementation is the authoritative backend path for the current code.
- The frontend references `list_pending_verifiers`, `list_active_verifiers`, `approve_verifier`, `reject_verifier`, `remove_verifier`, `confirm_email`, and `send-approval-email`. These are required for the complete account workflow. In the checked-in Supabase files, the visible migrations define the verifier analytics RPCs and `process_raw_to_survey`, but do not define those account-management RPCs or the email function. They must exist in the deployed Supabase project for registration approval to work end to end.
- Upload filtering is deliberately strict: `_validation_status` must be the exact string `Approved`, and a missing `uniqueID` is treated as a duplicate/not-inserted row.
- Approval statistics are calculated from `raw.sugarcane_survey`, while the administrator analytics are read from normalized `survey.*` views/tables. The upload promotion step is what makes newly accepted records visible to the analytics dashboard.

// supabase/functions/upload-verifier-export/index.ts
//
// Accepts a verified KoboToolbox Excel export from an approved verifier,
// inserts only NEW + Approved + unique-by-unique_id rows into
// raw.sugarcane_survey, and records the outcome in survey.upload_batch.
//
// raw.sugarcane_survey and survey.upload_batch both have RLS enabled with
// no permissive policies (raw.sugarcane_survey even has an explicit
// deny-all policy), and neither the `raw` nor `survey` Postgres schema is
// exposed to PostgREST on this project (only `public` is) — so this
// function talks to Postgres directly via SUPABASE_DB_URL rather than
// through the supabase-js REST client, and does the actual insert work in
// one real SQL transaction.

import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";
import * as XLSX from "npm:xlsx@0.18.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------
// Excel header (verbatim, exact strings from the KoboToolbox export) ->
// raw.sugarcane_survey column. The informed-consent paragraph header is
// deliberately absent from this map, so it is ignored automatically.
// ---------------------------------------------------------------------
const HEADER_MAP: Record<string, string> = {
  "collectionDate": "collection_date",
  "uniqueID": "unique_id",
  "Name of the Employee": "employee_name",
  "Designation": "enumerator_designation",
  "Name of the Organization": "organization_name",
  "State": "state",
  "Farmer Code": "farmer_code",
  "Name of the Farmer": "farmer_name",
  "Name of the Village": "village_name",
  "Block name": "block_name",
  "District name": "district_name",
  "Age": "age",
  "Education": "education",
  "Mobile Number of the Farmer": "mobile_number",
  "Select Year": "survey_year",
  "Crop": "crop",
  "Whether for ${Crop} during ${Year} was a normal year for you in terms of severe climatic events?": "normal_year_flag",
  "Which severe climatic events your ${Crop} faced during ${Year}?": "climatic_events",
  "Which severe climatic events your ${Crop} faced during ${Year}?/Erratic_rainfall": "event_erratic_rainfall",
  "Which severe climatic events your ${Crop} faced during ${Year}?/Cyclone": "event_cyclone",
  "Which severe climatic events your ${Crop} faced during ${Year}?/Drought": "event_drought",
  "Which severe climatic events your ${Crop} faced during ${Year}?/Flood": "event_flood",
  "Which severe climatic events your ${Crop} faced during ${Year}?/None": "event_none",
  "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?": "impact_stages",
  "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/sprouting": "stage_sprouting",
  "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/tillering": "stage_tillering",
  "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/grand_growth": "stage_grand_growth",
  "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/maturity": "stage_maturity",
  "What is the total acreage of the farmer under ${Crop} for the Year ${Year} in Acres?": "total_acreage",
  "What is the size of the largest plot of the ${Crop} Crop for the Year ${Year} in Acres?": "largest_plot_acres",
  "LandArea_hectare": "land_area_hectare",
  "What is the type of irrigation in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?": "irrigation_type",
  "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?": "fertilizer_application_method",
  "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Broadcasting": "method_broadcasting",
  "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Surface_fertigation": "method_surface_fertigation",
  "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Sub_surface_fertigation": "method_sub_surface_fertigation",
  "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Foliar_application": "method_foliar_application",
  "Select Crop Type": "crop_type",
  "Select Ratoon Type": "ratoon_type",
  "Do you wish to go for next Ratoon for this crop?": "next_ratoon_wish",
  "What is the Yield from the largest plot for ${Crop} Crop in Tonnes for the Year ${Year}.": "yield_tonnes",
  "Yield_Tonnes_ha": "yield_tonnes_ha",
  "Total Urea used in the largest plot of ${Crop} Crop (in Kgs.)": "urea_kg",
  "Total DAP used in the largest plot of ${Crop} Crop (in Kgs.)": "dap_kg",
  "Total SSP used in the largest plot of ${Crop} Crop (in Kgs.)": "ssp_kg",
  "Total MOP used in the largest plot of ${Crop} Crop (in Kgs.)": "mop_kg",
  "Total NPK 10-26-26 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_10_26_26_kg",
  "Total NPK 12-32-16 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_12_32_16_kg",
  "Total NPS 20-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)": "nps_20_20_0_13_kg",
  "Total Ammonium Sulphate used in the largest plot of ${Crop} Crop (in Kgs.)": "ammonium_sulphate_kg",
  "Total Ammonium Chloride used in the largest plot of ${Crop} Crop (in Kgs.)": "ammonium_chloride_kg",
  "Total NPK 17-17-17 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_17_17_17_kg",
  "Total NPKS-16-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)": "npks_16_20_0_13_kg",
  "Total NPK-16-16-16 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_16_16_16_kg",
  "Total NPK-12-61-0 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_12_61_0_kg",
  "Total NPKS-15-15-15-09 used in the largest plot of ${Crop} Crop (in Kgs.)": "npks_15_15_15_09_kg",
  "Total NPK-19-19-19 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_19_19_19_kg",
  "Total Mono_11_52_0 used in the largest plot of ${Crop} Crop (in Kgs.)": "mono_11_52_0_kg",
  "Total Calcium_ammonium_nitrate used in the largest plot of ${Crop} Crop (in Kgs.)": "calcium_ammonium_nitrate_kg",
  "Total Farm Yard Manure used in the largest plot of ${Crop} Crop (in Kgs.)": "farm_yard_manure_kg",
  "Total Vermicompost used in the largest plot of ${Crop} Crop (in Kgs.)": "vermicompost_kg",
  "Total Goat/Sheep Manure used in the largest plot of ${Crop} Crop (in Kgs.)": "goat_sheep_manure_kg",
  "Total Poultry Manure used in the largest plot of ${Crop} Crop (in Kgs.)": "poultry_manure_kg",
  "Total Press Mud used in the largest plot of ${Crop} Crop (in Kgs.)": "press_mud_kg",
  "Total Jeevamrut/GhanaJivamrut used in the largest plot of ${Crop} Crop (in Kgs.)": "jeevamrut_kg",
  "tna": "tna",
  "_validation_status": "validation_status",
};

const BOOLEAN_COLUMNS = new Set([
  "event_erratic_rainfall", "event_cyclone", "event_drought", "event_flood", "event_none",
  "stage_sprouting", "stage_tillering", "stage_grand_growth", "stage_maturity",
  "method_broadcasting", "method_surface_fertigation", "method_sub_surface_fertigation", "method_foliar_application",
]);

const NUMERIC_COLUMNS = new Set([
  "total_acreage", "largest_plot_acres", "land_area_hectare", "yield_tonnes", "yield_tonnes_ha",
  "urea_kg", "dap_kg", "ssp_kg", "mop_kg", "npk_10_26_26_kg", "npk_12_32_16_kg", "nps_20_20_0_13_kg",
  "ammonium_sulphate_kg", "ammonium_chloride_kg", "npk_17_17_17_kg", "npks_16_20_0_13_kg", "npk_16_16_16_kg",
  "npk_12_61_0_kg", "npks_15_15_15_09_kg", "npk_19_19_19_kg", "mono_11_52_0_kg", "calcium_ammonium_nitrate_kg",
  "farm_yard_manure_kg", "vermicompost_kg", "goat_sheep_manure_kg", "poultry_manure_kg", "press_mud_kg", "jeevamrut_kg",
]);

// Columns that get an explicit value on every insert, in addition to
// whatever HEADER_MAP produced for that row.
const EXTRA_COLUMNS = ["source", "created_by", "created_at", "updated_at"];

const INSERT_COLUMNS = [...new Set(Object.values(HEADER_MAP)), ...EXTRA_COLUMNS];

function toBool(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function toNumeric(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toSmallInt(v: unknown): number | null {
  const n = toNumeric(v);
  return n === null ? null : Math.trunc(n);
}

function toTimestamp(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function mapRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [header, column] of Object.entries(HEADER_MAP)) {
    const value = raw[header];
    if (column === "collection_date") out[column] = toTimestamp(value);
    else if (column === "survey_year") out[column] = toSmallInt(value);
    else if (BOOLEAN_COLUMNS.has(column)) out[column] = toBool(value);
    else if (NUMERIC_COLUMNS.has(column)) out[column] = toNumeric(value);
    else out[column] = toText(value); // includes unique_id, validation_status, tna
  }
  return out;
}

type Summary = {
  totalRowsInFile: number;
  approvedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  newRowsInserted: number;
  surveyRowsProcessed?: number;
  surveyProcessingError?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // ---- 1. Identify the caller -----------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await authClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "Not authenticated." });

  const sql = postgres(DB_URL, { prepare: false, ssl: "require" });

  try {
    // ---- 2. Must be an approved verifier -------------------------------
    const [profile] = await sql<{ role: string; status: string }[]>`
      select role, status from public.profiles where id = ${user.id}
    `;
    if (!profile || profile.role !== "verifier" || profile.status !== "approved") {
      await sql.end();
      return json(403, { error: "Only approved verifiers can upload exports." });
    }

    // ---- 3. Read the uploaded file --------------------------------------
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      await sql.end();
      return json(400, { error: "Expected multipart/form-data with a 'file' field." });
    }
    const filename = file.name;

    let rawRows: Record<string, unknown>[];
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(buf, { type: "array", cellDates: true, raw: true });
      const sheet = workbook.Sheets["Sheet1"];
      if (!sheet) throw new Error('Sheet "Sheet1" not found in workbook.');
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
      if (rawRows.length === 0) throw new Error("Sheet1 has no data rows.");
      const headers = Object.keys(rawRows[0]);
      if (!headers.includes("uniqueID") || !headers.includes("_validation_status")) {
        throw new Error("Missing required column(s): uniqueID and/or _validation_status.");
      }
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
      await sql`
        insert into survey.upload_batch
          (filename, uploaded_by, row_count, status, error_message)
        values
          (${filename}, ${user.id}, 0, 'failed', ${message})
      `;
      await sql.end();
      return json(422, { error: `Upload rejected: ${message}` });
    }

    // ---- 4. Map, filter, and insert — all inside one transaction --------
    const summary: Summary = {
      totalRowsInFile: rawRows.length,
      approvedRows: 0,
      rejectedRows: 0,
      duplicateRows: 0,
      newRowsInserted: 0,
    };

    try {
      await sql.begin(async (tx) => {
        for (const raw of rawRows) {
          const mapped = mapRow(raw);

          // Rule 2: only 'Approved' rows (case-sensitive, exact match) are eligible at all.
          if (mapped.validation_status !== "Approved") {
            summary.rejectedRows++;
            continue;
          }
          summary.approvedRows++;

          // A row can't be safely deduplicated without a unique_id — treat it
          // as "approved but not inserted", same bucket as a duplicate.
          if (!mapped.unique_id) {
            summary.duplicateRows++;
            continue;
          }

          const row = {
            ...mapped,
            source: "verifier_upload",
            created_by: user.id,
            created_at: new Date(),
            updated_at: new Date(),
          };

          // ON CONFLICT DO NOTHING here also absorbs duplicate unique_ids that
          // appear more than once within the same uploaded file: each insert
          // runs as its own statement inside this transaction, so a row
          // inserted earlier in this same loop is already visible to the
          // next ON CONFLICT check.
          const inserted = await tx`
            insert into raw.sugarcane_survey ${tx(row, ...INSERT_COLUMNS)}
            on conflict (unique_id) do nothing
            returning unique_id
          `;

          if (inserted.length > 0) summary.newRowsInserted++;
          else summary.duplicateRows++;
        }

        await tx`
          insert into survey.upload_batch
            (filename, uploaded_by, row_count, approved, not_approved, new_records, status)
          values
            (${filename}, ${user.id}, ${summary.totalRowsInFile}, ${summary.approvedRows},
             ${summary.rejectedRows}, ${summary.newRowsInserted}, 'complete')
        `;
      });
    } catch (txErr) {
      const message = txErr instanceof Error ? txErr.message : String(txErr);
      await sql`
        insert into survey.upload_batch
          (filename, uploaded_by, row_count, status, error_message)
        values
          (${filename}, ${user.id}, ${rawRows.length}, 'failed', ${message})
      `;
      await sql.end();
      return json(500, { error: `Upload failed, nothing was saved: ${message}` });
    }

    // ---- 5. Promote newly-approved raw rows into survey.* ----------------
    // The Admin dashboard reads survey.* (via survey.v_survey), not
    // raw.sugarcane_survey directly, so rows landed above aren't visible
    // there until this runs. It re-derives its own worklist (any Approved
    // raw row without a matching survey.surveys.unique_id) rather than
    // being scoped to just this upload, so it also mops up anything left
    // over from a previous run that failed partway through. A failure
    // here must not turn an already-committed raw insert into a reported
    // failure — surface it in the summary instead of throwing.
    try {
      const [{ process_raw_to_survey: processed }] = await sql<{ process_raw_to_survey: number }[]>`
        select public.process_raw_to_survey()
      `;
      summary.surveyRowsProcessed = processed;
    } catch (processErr) {
      summary.surveyProcessingError = processErr instanceof Error ? processErr.message : String(processErr);
    }

    await sql.end();
    return json(200, summary);
  } catch (e) {
    await sql.end({ timeout: 1 }).catch(() => {});
    const message = e instanceof Error ? e.message : String(e);
    return json(500, { error: message });
  }
});

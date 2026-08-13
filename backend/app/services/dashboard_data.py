import time
from sqlalchemy import text
from app.database import SessionLocal

CACHE_SECONDS = 900  # 15 min — data only actually changes via Kobo webhook,
                      # which clears this cache immediately anyway.
_cache: dict = {}


def _cached(key, loader):
    now = time.time()
    entry = _cache.get(key)
    if entry and (now - entry[0]) < CACHE_SECONDS:
        return entry[1]
    value = loader()
    _cache[key] = (now, value)
    return value


BASE_SURVEY_SQL = """
    SELECT
        s.survey_id,
        s.unique_id,
        s.collection_date,
        s.survey_year,
        s.crop,
        f.farmer_id,
        f.farmer_code,
        f.farmer_name,
        f.mobile_number,
        f.age,
        f.education,
        f.village_name,
        f.block_name,
        f.district_name,
        f.state,
        u.employee_name,
        u.designation AS employee_designation,
        l.total_acreage,
        l.largest_plot_acres,
        l.land_area_hectare,
        l.irrigation_type,
        cy.crop_type,
        cy.ratoon_type,
        cy.next_ratoon_wish,
        cy.yield_tonnes,
        cy.yield_tonnes_ha,
        ce.normal_year_flag,
        ce.climatic_events,
        ce.impact_stages,
        ce.event_erratic_rainfall,
        ce.event_cyclone,
        ce.event_drought,
        ce.event_flood,
        ce.event_none,
        ce.stage_sprouting,
        ce.stage_tillering,
        ce.stage_grand_growth,
        ce.stage_maturity,
        rs.tna AS raw_tna
    FROM survey.surveys s
    JOIN survey.farmers f ON f.farmer_id = s.farmer_id
    LEFT JOIN survey.users u ON u.user_id = s.user_id
    LEFT JOIN survey.land_details l ON l.survey_id = s.survey_id
    LEFT JOIN survey.crop_yield cy ON cy.survey_id = s.survey_id
    LEFT JOIN survey.climate_events ce ON ce.survey_id = s.survey_id
    LEFT JOIN raw.sugarcane_survey rs ON rs.unique_id = s.unique_id
    ORDER BY s.survey_id
"""

FERTILIZER_SQL = """
    SELECT survey_id, fertilizer_name, quantity_kg, application_method
    FROM survey.fertilizer_application
"""

# Nitrogen content factors per fertilizer/input type
NITROGEN_FACTORS = {
    "Urea": 0.46,
    "DAP": 0.18,
    "NPS 20:20:0:13": 0.20,
    "NPK 10:26:26": 0.10,
    "NPK 12:32:16": 0.12,
    "Ammonium Sulphate": 0.206,
    "Ammonium Chloride": 0.25,
    "NPK 17:17:17": 0.17,
    "NPKS 16:20:0:13": 0.16,
    "NPK 16:16:16": 0.16,
    "NPK 12:61:0": 0.12,
    "NPKS 15:15:15:09": 0.15,
    "NPK 19:19:19": 0.19,
    "Mono 11:52:0": 0.11,
    "Calcium Ammonium Nitrate": 0.25,
    "Farm Yard Manure": 0.005,
    "Press Mud": 0.012,
    "Vermicompost": 0.015,
    "Poultry Manure": 0.028,
    "Goat/Sheep Manure": 0.015,
    "Jeevamrut": 0.001,
}

# Fertilizer name -> category, and display-key used by the frontend tables
CORE_FERTILIZERS = {"Urea", "DAP", "MOP"}

SPECIALTY_KEY_MAP = {
    "SSP": "SSP",
    "NPK 10:26:26": "NPK 10-26-26",
    "Ammonium Sulphate": "Amm. Sulphate",
    "NPK 17:17:17": "NPK 17-17-17",
    "Calcium Ammonium Nitrate": "CAN",
}

ORGANIC_KEY_MAP = {
    "Vermicompost": "vermicompost",
    "Goat/Sheep Manure": "goatSheepManure",
    "Poultry Manure": "poultryManure",
    "Jeevamrut": "jeevamrut",
}
# Included in the organic chart / total volume KPI but not in the per-farmer table
ORGANIC_EXTRA = {"Farm Yard Manure", "Press Mud"}


def clear_cache():
    _cache.clear()


def load_base_rows():
    def _load():
        db = SessionLocal()
        try:
            rows = db.execute(text(BASE_SURVEY_SQL)).mappings().all()
            return [dict(r) for r in rows]
        finally:
            db.close()
    return _cached("base_rows", _load)


def load_fertilizer_rows():
    def _load():
        db = SessionLocal()
        try:
            rows = db.execute(text(FERTILIZER_SQL)).mappings().all()
            return [dict(r) for r in rows]
        finally:
            db.close()
    return _cached("fertilizer_rows", _load)


def fertilizer_totals_by_survey(fert_rows, base_rows=None):
    """survey_id -> Total Nitrogen Applied in kg N/ha (TNA)"""
    if base_rows is None:
        base_rows = load_base_rows()

    ha_by_survey = {r["survey_id"]: float(r["land_area_hectare"] or 0) for r in base_rows}
    raw_tna_by_survey = {
        r["survey_id"]: float(r["raw_tna"])
        for r in base_rows
        if r.get("raw_tna") is not None and float(r["raw_tna"]) > 0
    }

    elem_n_sum = {}
    for r in fert_rows:
        sid = r["survey_id"]
        fname = r["fertilizer_name"]
        qty = float(r["quantity_kg"] or 0)
        n_factor = NITROGEN_FACTORS.get(fname, 0.0)
        elem_n_sum[sid] = elem_n_sum.get(sid, 0.0) + (qty * n_factor)

    totals = {}
    for r in base_rows:
        sid = r["survey_id"]
        if sid in raw_tna_by_survey:
            totals[sid] = round(raw_tna_by_survey[sid], 2)
        else:
            ha = ha_by_survey.get(sid, 0.0)
            n_kg = elem_n_sum.get(sid, 0.0)
            totals[sid] = round(n_kg / ha, 2) if ha > 0 else 0.0

    return totals


def fertilizer_method_by_survey(fert_rows):
    """survey_id -> application_method (same value repeated per row, take any)"""
    methods = {}
    for r in fert_rows:
        if r["survey_id"] not in methods and r["application_method"]:
            methods[r["survey_id"]] = r["application_method"]
    return methods


def is_yes(v) -> bool:
    return str(v).strip().lower() in ("yes", "true", "1")
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.database import SessionLocal
from app.services.excel_import import (
    clean, clean_name, clean_phone, to_bool, to_float, to_int,
)
from app.services.etl import run_etl
from app.services.dashboard_data import clear_cache

router = APIRouter()
FIELD_CLEANERS = {
    "collection_date": clean,
    "unique_id": clean,
    "employee_name": clean_name,
    "enumerator_designation": clean,
    "organization_name": clean,
    "state": clean,
    "district_name": clean,
    "block_name": clean,
    "village_name": clean,
    "farmer_code": clean,
    "farmer_name": clean_name,
    "consent_response": to_bool,
    "age": clean,
    "education": clean,
    "mobile_number": clean_phone,
    "survey_year": to_int,
    "crop": clean,
    "normal_year_flag": clean,
    "climatic_events": clean,
    "event_erratic_rainfall": to_bool,
    "event_cyclone": to_bool,
    "event_drought": to_bool,
    "event_flood": to_bool,
    "event_none": to_bool,
    "impact_stages": clean,
    "stage_sprouting": to_bool,
    "stage_tillering": to_bool,
    "stage_grand_growth": to_bool,
    "stage_maturity": to_bool,
    "total_acreage": to_float,
    "largest_plot_acres": to_float,
    "land_area_hectare": to_float,
    "irrigation_type": clean,
    "fertilizer_application_method": clean,
    "method_broadcasting": to_bool,
    "method_surface_fertigation": to_bool,
    "method_sub_surface_fertigation": to_bool,
    "method_foliar_application": to_bool,
    "crop_type": clean,
    "ratoon_type": clean,
    "next_ratoon_wish": clean,
    "yield_tonnes": to_float,
    "yield_tonnes_ha": to_float,
    "urea_kg": to_float,
    "dap_kg": to_float,
    "ssp_kg": to_float,
    "mop_kg": to_float,
    "npk_10_26_26_kg": to_float,
    "npk_12_32_16_kg": to_float,
    "nps_20_20_0_13_kg": to_float,
    "ammonium_sulphate_kg": to_float,
    "ammonium_chloride_kg": to_float,
    "npk_17_17_17_kg": to_float,
    "npks_16_20_0_13_kg": to_float,
    "npk_16_16_16_kg": to_float,
    "npk_12_61_0_kg": to_float,
    "npks_15_15_15_09_kg": to_float,
    "npk_19_19_19_kg": to_float,
    "mono_11_52_0_kg": to_float,
    "calcium_ammonium_nitrate_kg": to_float,
    "farm_yard_manure_kg": to_float,
    "vermicompost_kg": to_float,
    "goat_sheep_manure_kg": to_float,
    "poultry_manure_kg": to_float,
    "press_mud_kg": to_float,
    "jeevamrut_kg": to_float,
    "tna": clean,
}


@router.post("/kobo")
async def receive_kobo(payload: dict):
    db = SessionLocal()
    try:
        # Clean every field the same way the Excel importer does, so a Kobo
        # submission is stored identically to one that came in via Excel.
        cleaned = {
            field: cleaner(payload.get(field))
            for field, cleaner in FIELD_CLEANERS.items()
        }

        if not cleaned["unique_id"]:
            raise HTTPException(status_code=422, detail="Missing unique_id in submission")

        columns = ", ".join(cleaned.keys())
        placeholders = ", ".join(f":{k}" for k in cleaned.keys())

        db.execute(
            text(f"INSERT INTO raw.sugarcane_survey ({columns}) VALUES ({placeholders})"),
            cleaned,
        )
        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

    # Push the new raw row into the normalized survey.* tables the
    # dashboard actually reads from. run_etl() skips rows it has already
    # processed, so this is safe to call on every submission.
    try:
        run_etl()
        clear_cache()
    except Exception as e:
        # The raw row is saved either way; surface the ETL failure so it's
        # visible (e.g. in server logs / response) without losing the data.
        raise HTTPException(
            status_code=207,
            detail=f"Survey saved, but ETL processing failed: {e}",
        )

    return {
        "status": "success",
        "message": "Survey stored and processed into dashboard tables.",
    }
from typing import Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.database import SessionLocal
from app.services.dashboard_data import (
    load_base_rows,
    load_fertilizer_rows,
    fertilizer_totals_by_survey,
    SPECIALTY_KEY_MAP,
    ORGANIC_KEY_MAP,
    CORE_FERTILIZERS,
    NITROGEN_FACTORS,
)

router = APIRouter()


@router.get("/")
def list_surveys(
    year: Optional[int] = None,
    village: Optional[str] = None,
    block: Optional[str] = None,
):
    rows = load_base_rows()

    if year is not None:
        rows = [r for r in rows if r["survey_year"] == year]
    if village is not None:
        rows = [r for r in rows if (r["village_name"] or "") == village]
    if block is not None:
        rows = [r for r in rows if (r["block_name"] or "") == block]

    return [
        {
            "surveyId": r["survey_id"],
            "farmerCode": r["farmer_code"],
            "name": r["farmer_name"],
            "village": r["village_name"],
            "block": r["block_name"],
            "collectionDate": str(r["collection_date"]) if r["collection_date"] else None,
            "crop": r["crop"],
        }
        for r in rows
    ]


@router.get("/{survey_id}/profile")
def survey_profile(survey_id: int):
    db = SessionLocal()
    try:
        row = db.execute(
            text(
                """
                SELECT
                    s.survey_id, s.unique_id, s.collection_date, s.crop,
                    f.farmer_code, f.farmer_name, f.mobile_number, f.state,
                    f.district_name, f.block_name, f.village_name,
                    u.employee_name, u.designation AS employee_designation,
                    l.largest_plot_acres, l.land_area_hectare,
                    cy.next_ratoon_wish, cy.yield_tonnes_ha,
                    ce.climatic_events, ce.impact_stages,
                    rs.tna AS raw_tna
                FROM survey.surveys s
                JOIN survey.farmers f ON f.farmer_id = s.farmer_id
                LEFT JOIN survey.users u ON u.user_id = s.user_id
                LEFT JOIN survey.land_details l ON l.survey_id = s.survey_id
                LEFT JOIN survey.crop_yield cy ON cy.survey_id = s.survey_id
                LEFT JOIN survey.climate_events ce ON ce.survey_id = s.survey_id
                LEFT JOIN raw.sugarcane_survey rs ON rs.unique_id = s.unique_id
                WHERE s.survey_id = :survey_id
                """
            ),
            {"survey_id": survey_id},
        ).mappings().first()

        if row is None:
            raise HTTPException(status_code=404, detail="Survey not found")

        fert_rows = db.execute(
            text(
                """
                SELECT fertilizer_name, quantity_kg, application_method
                FROM survey.fertilizer_application
                WHERE survey_id = :survey_id
                """
            ),
            {"survey_id": survey_id},
        ).mappings().all()

        raw_tna = row.get("raw_tna")
        if raw_tna is not None and float(raw_tna) > 0:
            total_nutrient = float(raw_tna)
        else:
            ha = float(row["land_area_hectare"] or 0)
            elem_n = sum(float(fr["quantity_kg"] or 0) * NITROGEN_FACTORS.get(fr["fertilizer_name"], 0.0) for fr in fert_rows)
            total_nutrient = (elem_n / ha) if ha > 0 else 0.0

        method = next((fr["application_method"] for fr in fert_rows if fr["application_method"]), None)

        fertilizer_usage = {}
        organic_usage = {}
        for fr in fert_rows:
            name = fr["fertilizer_name"]
            qty = round(float(fr["quantity_kg"] or 0), 2)
            if name in CORE_FERTILIZERS or name in SPECIALTY_KEY_MAP:
                fertilizer_usage[name] = qty
            elif name in ORGANIC_KEY_MAP:
                organic_usage[name] = qty
            else:
                organic_usage[name] = qty

        return {
            "surveyId": row["survey_id"],
            "koboUniqueId": row["unique_id"],
            "farmerCode": row["farmer_code"],
            "name": row["farmer_name"],
            "mobileNumber": row["mobile_number"],
            "state": row["state"],
            "district": row["district_name"],
            "block": row["block_name"],
            "village": row["village_name"],
            "crop": row["crop"],
            "collectionDate": str(row["collection_date"]) if row["collection_date"] else None,
            "employeeName": row["employee_name"],
            "employeeDesignation": row["employee_designation"],
            "largestPlotAcres": row["largest_plot_acres"],
            "landAreaHectare": row["land_area_hectare"],
            "wantsNextRatoon": (row["next_ratoon_wish"] == "Yes") if row["next_ratoon_wish"] else None,
            "yieldTonnesPerHa": row["yield_tonnes_ha"],
            "totalNutrientApplied": round(total_nutrient, 2),
            "fertilizerMethod": method,
            "severeClimaticEvents": row["climatic_events"] or "None",
            "growthStageImpacted": row["impact_stages"],
            "fertilizerUsage": fertilizer_usage,
            "organicUsage": organic_usage,
            "acknowledged": False,
            "acknowledgedBy": None,
        }
    finally:
        db.close()
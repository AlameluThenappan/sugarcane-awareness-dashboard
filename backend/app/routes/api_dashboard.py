from collections import Counter
from fastapi import APIRouter

from app.services.dashboard_data import (
    load_base_rows,
    load_fertilizer_rows,
    fertilizer_totals_by_survey,
    fertilizer_method_by_survey,
    is_yes,
    CORE_FERTILIZERS,
    SPECIALTY_KEY_MAP,
    ORGANIC_KEY_MAP,
    ORGANIC_EXTRA,
)
from app.services.village_coords import get_coords

router = APIRouter()


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 2) if values else 0


def _top(counter: Counter, default="N/A"):
    return counter.most_common(1)[0][0] if counter else default


@router.get("/summary")
def summary():
    rows = load_base_rows()
    fert_rows = load_fertilizer_rows()
    tna = fertilizer_totals_by_survey(fert_rows, rows)

    total_farmers = len({r["farmer_id"] for r in rows})
    total_surveys = len(rows)
    total_acres = sum(r["total_acreage"] or 0 for r in rows)
    yields = [r["yield_tonnes_ha"] for r in rows if r["yield_tonnes_ha"]]
    n_values = list(tna.values())

    plant_crop = sum(1 for r in rows if (r["crop_type"] or "") == "Plant Crop")
    ratoon = sum(1 for r in rows if (r["crop_type"] or "") == "Ratoon")
    crop_total = plant_crop + ratoon or 1

    normal_year = sum(1 for r in rows if is_yes(r["normal_year_flag"]))
    climate_total = sum(1 for r in rows if r["normal_year_flag"] is not None) or 1

    return {
        "totalFarmers": total_farmers,
        "totalSurveys": total_surveys,
        "totalAcres": round(total_acres, 2),
        "avgYield": _avg(yields),
        "avgNitrogen": _avg(n_values),
        "plantCropPct": round(plant_crop / crop_total * 100),
        "ratoonPct": round(ratoon / crop_total * 100),
        "blockCount": len({r["block_name"] for r in rows if r["block_name"]}),
        "villageCount": len({r["village_name"] for r in rows if r["village_name"]}),
        "acknowledgedCount": 0,
        "pendingAcknowledgementCount": total_surveys,
        "normalYearPct": round(normal_year / climate_total * 100),
        "stressedYearPct": round(100 - (normal_year / climate_total * 100)),
    }


@router.get("/analytics-raw")
def analytics_raw():
    rows = load_base_rows()
    fert_rows = load_fertilizer_rows()
    tna = fertilizer_totals_by_survey(fert_rows, rows)

    return [
        {
            "surveyId": r["survey_id"],
            "id": r["farmer_code"],
            "name": r["farmer_name"],
            "village": r["village_name"],
            "yield": r["yield_tonnes_ha"] or 0,
            "n": tna.get(r["survey_id"], 0),
            "acres": r["total_acreage"] or 0,
        }
        for r in rows
    ]


@router.get("/identity-page")
def identity_page():
    rows = load_base_rows()

    village_counts = Counter(r["village_name"] for r in rows if r["village_name"])
    edu_counts = Counter(r["education"] for r in rows if r["education"])
    age_buckets = Counter(r["age"].strip() for r in rows if r["age"] and str(r["age"]).strip())

    edu_yield = {}
    for r in rows:
        edu = r["education"]
        if not edu:
            continue
        edu_yield.setdefault(edu, []).append(r["yield_tonnes_ha"] or 0)

    return {
        "totalFarmers": len({r["farmer_id"] for r in rows}),
        "topVillage": _top(village_counts),
        "topEdu": _top(edu_counts),
        "villageData": [{"name": n, "value": v} for n, v in village_counts.most_common(10)],
        "ageData": [{"name": n, "value": v} for n, v in age_buckets.items()],
        "eduData": [
            {"name": edu, "Farmers": len(ys), "AvgYield": _avg(ys)}
            for edu, ys in edu_yield.items()
        ],
        "records": [
            {
                "surveyId": r["survey_id"],
                "farmerCode": r["farmer_code"],
                "name": r["farmer_name"],
                "mobileNumber": r["mobile_number"],
                "collectionDate": str(r["collection_date"]) if r["collection_date"] else None,
                "employee": r["employee_name"],
                "village": r["village_name"],
                "block": r["block_name"],
            }
            for r in rows
        ],
    }


@router.get("/land-page")
def land_page():
    rows = load_base_rows()

    total_acres = sum(r["total_acreage"] or 0 for r in rows)
    plots = [r["largest_plot_acres"] for r in rows if r["largest_plot_acres"]]
    yields = [r["yield_tonnes_ha"] for r in rows if r["yield_tonnes_ha"]]

    irr_groups = {}
    for r in rows:
        irr = r["irrigation_type"] or "Unknown"
        irr_groups.setdefault(irr, {"acres": 0, "yields": [], "count": 0})
        irr_groups[irr]["acres"] += r["total_acreage"] or 0
        irr_groups[irr]["count"] += 1
        if r["yield_tonnes_ha"]:
            irr_groups[irr]["yields"].append(r["yield_tonnes_ha"])

    yield_buckets = Counter()
    for r in rows:
        y = r["yield_tonnes_ha"]
        if not y:
            continue
        bucket = "<80" if y < 80 else "80-100" if y < 100 else "100-120" if y < 120 else "120+"
        yield_buckets[bucket] += 1

    return {
        "totalAcres": round(total_acres, 2),
        "avgPlot": _avg(plots),
        "avgYield": _avg(yields),
        "yieldDistData": [{"name": n, "value": v} for n, v in yield_buckets.items()],
        "yieldIrrData": [
            {
                "name": name,
                "Farmers": g["count"],
                "TotalAcres": round(g["acres"], 2),
                "AvgYield": _avg(g["yields"]),
            }
            for name, g in irr_groups.items()
        ],
        "records": [
            {
                "surveyId": r["survey_id"],
                "name": r["farmer_name"],
                "village": r["village_name"],
                "largestPlotAcres": r["largest_plot_acres"],
                "landAreaHa": r["land_area_hectare"],
            }
            for r in rows
        ],
    }


@router.get("/yield-page")
def yield_page():
    rows = load_base_rows()
    fert_rows = load_fertilizer_rows()
    tna = fertilizer_totals_by_survey(fert_rows, rows)

    yields = [r["yield_tonnes_ha"] for r in rows if r["yield_tonnes_ha"]]
    n_values = list(tna.values())

    n_groups = {}
    for r in rows:
        n = tna.get(r["survey_id"], 0)
        bucket = "0-200" if n < 200 else "200-400" if n < 400 else "400-600" if n < 600 else "600+"
        n_groups.setdefault(bucket, {"count": 0, "yields": []})
        n_groups[bucket]["count"] += 1
        if r["yield_tonnes_ha"]:
            n_groups[bucket]["yields"].append(r["yield_tonnes_ha"])

    return {
        "avgYield": _avg(yields),
        "avgN": _avg(n_values),
        "maxYield": round(max(yields), 2) if yields else 0,
        "comboData": [
            {"name": name, "Farmers": g["count"], "AvgYield": _avg(g["yields"])}
            for name, g in sorted(n_groups.items())
        ],
        "scatterData": [
            {"acres": r["total_acreage"] or 0, "yield": r["yield_tonnes_ha"] or 0, "name": r["farmer_name"]}
            for r in rows
        ],
        "records": [
            {
                "surveyId": r["survey_id"],
                "name": r["farmer_name"],
                "village": r["village_name"],
                "acres": r["total_acreage"] or 0,
                "yield": r["yield_tonnes_ha"] or 0,
                "tna": round(tna.get(r["survey_id"], 0), 2),
            }
            for r in rows
        ],
    }


@router.get("/ratoon-page")
def ratoon_page():
    rows = load_base_rows()

    rt_counts = Counter(r["crop_type"] for r in rows if r["crop_type"])
    plant_crop = rt_counts.get("Plant Crop", 0)
    ratoon = rt_counts.get("Ratoon", 0)
    crop_total = plant_crop + ratoon or 1

    next_groups = {}
    for r in rows:
        wish = r["next_ratoon_wish"] or "Unknown"
        next_groups.setdefault(wish, []).append(r["yield_tonnes_ha"] or 0)
    next_yes = sum(1 for r in rows if (r["next_ratoon_wish"] or "") == "Yes")
    next_total = sum(1 for r in rows if r["next_ratoon_wish"]) or 1

    return {
        "rtData": [{"name": n, "value": v} for n, v in rt_counts.items()],
        "nextData": [
            {"name": wish, "Farmers": len(ys), "AvgYield": _avg(ys)}
            for wish, ys in next_groups.items()
        ],
        "pctRatoon": round(ratoon / crop_total * 100),
        "pctNext": round(next_yes / next_total * 100),
        "records": [
            {
                "surveyId": r["survey_id"],
                "name": r["farmer_name"],
                "village": r["village_name"],
                "crop": r["crop_type"],
                "wishNextRatoon": r["next_ratoon_wish"],
            }
            for r in rows
        ],
    }


@router.get("/fertilizer-page")
def fertilizer_page():
    rows = load_base_rows()
    fert_rows = load_fertilizer_rows()
    tna = fertilizer_totals_by_survey(fert_rows, rows)
    methods = fertilizer_method_by_survey(fert_rows)

    core_totals = Counter()
    for r in fert_rows:
        if r["fertilizer_name"] in CORE_FERTILIZERS:
            core_totals[r["fertilizer_name"]] += float(r["quantity_kg"] or 0)

    method_counts = Counter(methods.values())

    return {
        "fertData": [{"name": n, "value": round(v, 2)} for n, v in core_totals.most_common()],
        "methData": [{"name": n, "value": v} for n, v in method_counts.most_common()],
        "avgN": _avg(list(tna.values())),
        "records": [
            {
                "surveyId": r["survey_id"],
                "name": r["farmer_name"],
                "village": r["village_name"],
                "method": methods.get(r["survey_id"], "Unknown"),
            }
            for r in rows
        ],
    }


@router.get("/climate-page")
def climate_page():
    rows = load_base_rows()

    event_counts = Counter()
    for r in rows:
        if r["event_erratic_rainfall"]:
            event_counts["Erratic Rainfall"] += 1
        if r["event_cyclone"]:
            event_counts["Cyclone"] += 1
        if r["event_drought"]:
            event_counts["Drought"] += 1
        if r["event_flood"]:
            event_counts["Flood"] += 1
        if r["event_none"]:
            event_counts["None"] += 1

    stage_counts = Counter()
    for r in rows:
        if r["stage_sprouting"]:
            stage_counts["Sprouting"] += 1
        if r["stage_tillering"]:
            stage_counts["Tillering"] += 1
        if r["stage_grand_growth"]:
            stage_counts["Grand Growth"] += 1
        if r["stage_maturity"]:
            stage_counts["Maturity"] += 1

    normal_year = sum(1 for r in rows if is_yes(r["normal_year_flag"]))
    climate_total = sum(1 for r in rows if r["normal_year_flag"] is not None) or 1

    stress_only = Counter({k: v for k, v in event_counts.items() if k != "None"})

    return {
        "evData": [{"name": n, "value": v} for n, v in event_counts.items()],
        "stData": [{"name": n, "value": v} for n, v in stage_counts.items()],
        "pctNormal": round(normal_year / climate_total * 100),
        "topStress": _top(stress_only, default="None"),
        "records": [
            {
                "surveyId": r["survey_id"],
                "name": r["farmer_name"],
                "village": r["village_name"],
                "severeEvents": r["climatic_events"],
                "growthStage": r["impact_stages"],
            }
            for r in rows
        ],
    }


@router.get("/longtail-fertilizer-page")
def longtail_fertilizer_page():
    fert_rows = load_fertilizer_rows()
    rows = load_base_rows()
    name_by_survey = {r["survey_id"]: r["farmer_name"] for r in rows}

    per_survey = {}
    usage_counts = Counter()
    for r in fert_rows:
        display_key = SPECIALTY_KEY_MAP.get(r["fertilizer_name"])
        if not display_key:
            continue
        sid = r["survey_id"]
        per_survey.setdefault(sid, {"surveyId": sid, "name": name_by_survey.get(sid)})
        per_survey[sid][display_key] = round(float(r["quantity_kg"] or 0), 2)
        usage_counts[display_key] += 1

    using_any = len(per_survey)
    top = _top(usage_counts, default="N/A")

    return {
        "chartData": [{"name": n, "value": v} for n, v in usage_counts.most_common()],
        "top": top,
        "usingAny": using_any,
        "records": list(per_survey.values()),
    }


@router.get("/longtail-organic-page")
def longtail_organic_page():
    fert_rows = load_fertilizer_rows()
    rows = load_base_rows()
    name_by_survey = {r["survey_id"]: r["farmer_name"] for r in rows}

    per_survey = {}
    usage_counts = Counter()
    total_volume = 0.0
    all_organic_names = set(ORGANIC_KEY_MAP.keys()) | ORGANIC_EXTRA

    for r in fert_rows:
        if r["fertilizer_name"] not in all_organic_names:
            continue
        qty = float(r["quantity_kg"] or 0)
        total_volume += qty
        usage_counts[r["fertilizer_name"]] += 1

        display_key = ORGANIC_KEY_MAP.get(r["fertilizer_name"])
        if display_key:
            sid = r["survey_id"]
            per_survey.setdefault(sid, {"surveyId": sid, "name": name_by_survey.get(sid)})
            per_survey[sid][display_key] = round(qty, 2)

    top = _top(usage_counts, default="N/A")

    return {
        "chartData": [{"name": n, "value": v} for n, v in usage_counts.most_common()],
        "top": top,
        "vol": round(total_volume, 2),
        "records": list(per_survey.values()),
    }


@router.get("/villages")
def villages():
    """Per-village rollup: farmers, acres, avg yield, avg TNA, block.
    Used by the Overview page for its top-villages and block-coverage charts."""
    rows = load_base_rows()
    fert_rows = load_fertilizer_rows()
    tna = fertilizer_totals_by_survey(fert_rows, rows)

    groups: dict[str, dict] = {}
    for r in rows:
        name = r["village_name"] or "Unknown"
        g = groups.setdefault(
            name,
            {"village": name, "block": r["block_name"] or "Unknown", "acres": 0.0, "yields": [], "n": []},
        )
        g["acres"] += float(r["total_acreage"] or 0)
        if r["yield_tonnes_ha"]:
            g["yields"].append(r["yield_tonnes_ha"])
        g["n"].append(tna.get(r["survey_id"], 0))

    farmer_counts = Counter(r["village_name"] for r in rows if r["village_name"])

    return [
        {
            "village": g["village"],
            "block": g["block"],
            "farmers": farmer_counts.get(g["village"], 0),
            "acres": round(g["acres"], 2),
            "yield": _avg(g["yields"]),
            "tna": _avg(g["n"]),
        }
        for g in groups.values()
    ]


@router.get("/farmer-locations")
def farmer_locations():
    rows = load_base_rows()
    result = []
    for r in rows:
        lat, lng = get_coords(r["village_name"], r["survey_id"])
        result.append(
            {
                "surveyId": r["survey_id"],
                "name": r["farmer_name"],
                "village": r["village_name"],
                "block": r["block_name"],
                "lat": lat,
                "lng": lng,
                "yield": r["yield_tonnes_ha"] or 0,
                "acres": r["total_acreage"] or 0,
            }
        )
    return result
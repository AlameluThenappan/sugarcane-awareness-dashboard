import sys
sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import text
from app.database import SessionLocal
from app.services.dashboard_data import load_base_rows, load_fertilizer_rows

db = SessionLocal()
rows = load_base_rows()
fert_rows = load_fertilizer_rows()

print("==================================================")
print("       KPI AUDIT & VERIFICATION SUMMARY          ")
print("==================================================")

# 1. Farmers & Surveys Count
total_farmers = len({r["farmer_id"] for r in rows})
total_surveys = len(rows)
print(f"Total Farmers: {total_farmers}")
print(f"Total Surveys: {total_surveys}")

# 2. Acreage
total_acres = sum(r["total_acreage"] or 0 for r in rows)
total_ha = sum(r["land_area_hectare"] or 0 for r in rows)
avg_plot_acres = sum(r["largest_plot_acres"] for r in rows if r["largest_plot_acres"]) / sum(1 for r in rows if r["largest_plot_acres"])
print(f"Total Acreage (Acres): {total_acres:.2f} (Rounded UI: {round(total_acres)})")
print(f"Total Land Area (Hectares): {total_ha:.2f}")
print(f"Average Plot Size (Acres): {avg_plot_acres:.2f}")

# 3. Crop Yield
yields = [r["yield_tonnes_ha"] for r in rows if r["yield_tonnes_ha"] is not None and r["yield_tonnes_ha"] > 0]
avg_yield = sum(yields) / len(yields)
max_yield = max(yields)
print(f"Average Yield (t/ha): {avg_yield:.2f}")
print(f"Max Yield (t/ha): {max_yield:.2f}")

# 4. Nitrogen / TNA (Current wrong vs Corrected formula)
# Current wrong formula in dashboard_data:
fert_sum_by_survey = {}
for r in fert_rows:
    fert_sum_by_survey[r["survey_id"]] = fert_sum_by_survey.get(r["survey_id"], 0) + float(r["quantity_kg"] or 0)

current_avg_n = sum(fert_sum_by_survey.values()) / len(fert_sum_by_survey)
print(f"\n[CURRENT BACKEND BUG] Avg Nitrogen (Sum of raw kg): {current_avg_n:.2f} kg")

# Single query for raw tna
raw_tna_map = dict(db.execute(text("SELECT sv.survey_id, s.tna FROM raw.sugarcane_survey s JOIN survey.surveys sv ON sv.unique_id=s.unique_id")).fetchall())

tna_by_survey = {}
for r in rows:
    sid = r["survey_id"]
    val = raw_tna_map.get(sid)
    if val is not None and float(val) > 0:
        tna_by_survey[sid] = float(val)
    else:
        # Calculate elemental N per hectare if not present
        ha = float(r["land_area_hectare"] or 0)
        # sum fertilizer N for this survey
        s_ferts = [fr for fr in fert_rows if fr["survey_id"] == sid]
        # elemental N factors
        N_FACTORS = {
            "Urea": 0.46, "DAP": 0.18, "NPS 20:20:0:13": 0.20, "NPK 10:26:26": 0.10,
            "NPK 12:32:16": 0.12, "Ammonium Sulphate": 0.206, "Ammonium Chloride": 0.25,
            "NPK 17:17:17": 0.17, "NPKS 16:20:0:13": 0.16, "NPK 16:16:16": 0.16,
            "NPK 12:61:0": 0.12, "NPKS 15:15:15:09": 0.15, "NPK 19:19:19": 0.19,
            "Mono 11:52:0": 0.11, "Calcium Ammonium Nitrate": 0.25,
            "Farm Yard Manure": 0.005, "Press Mud": 0.012, "Vermicompost": 0.015,
            "Poultry Manure": 0.028, "Goat/Sheep Manure": 0.015
        }
        tot_n = sum(float(fr["quantity_kg"] or 0) * N_FACTORS.get(fr["fertilizer_name"], 0) for fr in s_ferts)
        tna_by_survey[sid] = (tot_n / ha) if ha > 0 else 0.0

tna_vals = list(tna_by_survey.values())
correct_avg_n = sum(tna_vals) / len(tna_vals)
print(f"[CORRECTED FORMULA] Avg Nitrogen (kg N / ha): {correct_avg_n:.2f} kg N/ha")

# 5. Crop Split
plant_crop = sum(1 for r in rows if (r["crop_type"] or "") == "Plant Crop")
ratoon = sum(1 for r in rows if (r["crop_type"] or "") == "Ratoon")
crop_total = plant_crop + ratoon
print(f"\nCrop Split: Plant Crop = {plant_crop} ({plant_crop/crop_total*100:.1f}%), Ratoon = {ratoon} ({ratoon/crop_total*100:.1f}%)")

# 6. Climate Split
normal_year = sum(1 for r in rows if str(r["normal_year_flag"]).strip().lower() in ("yes", "true", "1"))
climate_total = sum(1 for r in rows if r["normal_year_flag"] is not None)
print(f"Climate Impact: Normal = {normal_year} ({normal_year/climate_total*100:.1f}%), Stressed = {climate_total - normal_year} ({(climate_total - normal_year)/climate_total*100:.1f}%)")

# 7. Organics Total Volume
ORGANIC_NAMES = {"Vermicompost", "Goat/Sheep Manure", "Poultry Manure", "Jeevamrut", "Farm Yard Manure", "Press Mud"}
total_org_kg = sum(float(r["quantity_kg"] or 0) for r in fert_rows if r["fertilizer_name"] in ORGANIC_NAMES)
print(f"\nTotal Organic Input Volume: {total_org_kg:,.2f} kg ({total_org_kg/1000:,.2f} tonnes)")

# 8. Outlier count with corrected TNA
N_THRESHOLD = 130
outliers_count = sum(1 for r in rows if tna_by_survey.get(r["survey_id"], 0) >= N_THRESHOLD and (r["yield_tonnes_ha"] or 0) < avg_yield and (r["yield_tonnes_ha"] or 0) > 0)
print(f"Critical Nitrogen Inefficiency Outliers (TNA >= 130 kg N/ha & Yield < {avg_yield:.1f} t/ha): {outliers_count} farms")

db.close()

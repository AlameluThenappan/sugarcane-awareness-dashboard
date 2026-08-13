import sys
sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

rows = db.execute(text("SELECT farmer_code, tna, land_area_hectare, urea_kg, dap_kg, mop_kg, nps_20_20_0_13_kg, npk_17_17_17_kg, npk_19_19_19_kg, ammonium_sulphate_kg, farm_yard_manure_kg, press_mud_kg, vermicompost_kg, poultry_manure_kg, jeevamrut_kg FROM raw.sugarcane_survey WHERE tna IS NOT NULL")).mappings().all()

print(f"Total raw rows with TNA: {len(rows)}")

matches_chem = 0
matches_org = 0

for r in rows:
    raw_tna = float(r['tna'])
    ha = float(r['land_area_hectare'] or 0)
    if ha <= 0:
        continue
    
    chem_n = (
        float(r['urea_kg'] or 0)*0.46 +
        float(r['dap_kg'] or 0)*0.18 +
        float(r['nps_20_20_0_13_kg'] or 0)*0.20 +
        float(r['npk_17_17_17_kg'] or 0)*0.17 +
        float(r['npk_19_19_19_kg'] or 0)*0.19 +
        float(r['ammonium_sulphate_kg'] or 0)*0.206
    )
    
    tna_calc_chem = chem_n / ha
    diff_chem = abs(raw_tna - tna_calc_chem)
    
    if diff_chem < 0.1:
        matches_chem += 1
    else:
        # Check with FYM (0.005 N), Press Mud (0.012 N), Vermicompost (0.015 N), Poultry (0.028 N)
        org_n = (
            float(r['farm_yard_manure_kg'] or 0)*0.005 +
            float(r['press_mud_kg'] or 0)*0.012 +
            float(r['vermicompost_kg'] or 0)*0.015 +
            float(r['poultry_manure_kg'] or 0)*0.028
        )
        tna_calc_org = (chem_n + org_n) / ha
        diff_org = abs(raw_tna - tna_calc_org)
        print(f"Farmer {r['farmer_code']}: raw_tna={raw_tna:.3f}, chem_calc={tna_calc_chem:.3f} (diff={diff_chem:.3f}), org_calc={tna_calc_org:.3f} (diff={diff_org:.3f})")

print(f"\nExact matches with Chemical N per ha: {matches_chem} / {len(rows)}")

db.close()

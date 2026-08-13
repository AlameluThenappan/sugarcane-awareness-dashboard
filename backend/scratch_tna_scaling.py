import sys
sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

rows = db.execute(text("SELECT id, farmer_code, tna, land_area_hectare, total_acreage, urea_kg, dap_kg, mop_kg, ssp_kg, npk_10_26_26_kg, nps_20_20_0_13_kg FROM raw.sugarcane_survey WHERE tna IS NOT NULL LIMIT 15")).mappings().all()

print("--- TESTING TNA PER HECTARE OR PER ACRE ---")
for r in rows:
    raw_tna = float(r['tna'])
    ha = float(r['land_area_hectare'] or 0)
    ac = float(r['total_acreage'] or 0)
    
    # Elemental N
    n_elem = float(r['urea_kg'] or 0)*0.46 + float(r['dap_kg'] or 0)*0.18 + float(r['nps_20_20_0_13_kg'] or 0)*0.20 + float(r['npk_10_26_26_kg'] or 0)*0.10
    
    # Chemical fertilizer total weight (kg)
    chem_total = sum(float(r[k] or 0) for k in ['urea_kg', 'dap_kg', 'mop_kg', 'ssp_kg', 'npk_10_26_26_kg', 'nps_20_20_0_13_kg'])
    
    print(f"Farmer: {r['farmer_code']} | Raw TNA: {raw_tna:8.2f} | ha: {ha:.2f} | ac: {ac:.2f}")
    if ha > 0:
        print(f"   -> Raw TNA / ha: {raw_tna/ha:8.2f} | Chem Total / ha: {chem_total/ha:8.2f} | N elem / ha: {n_elem/ha:8.2f}")
    if ac > 0:
        print(f"   -> Raw TNA / ac: {raw_tna/ac:8.2f} | Chem Total / ac: {chem_total/ac:8.2f} | N elem / ac: {n_elem/ac:8.2f}")

db.close()

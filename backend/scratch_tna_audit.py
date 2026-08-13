import sys
sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

raw_rows = db.execute(text("SELECT id, farmer_code, tna, urea_kg, dap_kg, mop_kg, ssp_kg, npk_10_26_26_kg, npk_12_32_16_kg, nps_20_20_0_13_kg, ammonium_sulphate_kg, ammonium_chloride_kg, npk_17_17_17_kg, npks_16_20_0_13_kg, npk_16_16_16_kg, npk_12_61_0_kg, npks_15_15_15_09_kg, npk_19_19_19_kg, mono_11_52_0_kg, calcium_ammonium_nitrate_kg, farm_yard_manure_kg, vermicompost_kg FROM raw.sugarcane_survey LIMIT 20")).mappings().all()

print("--- RAW TNA vs FERTILIZER COLUMNS ---")
for r in raw_rows[:10]:
    print(f"ID: {r['id']} | Farmer: {r['farmer_code']} | Raw TNA col: {r['tna']}")
    chem_sum = sum(float(r[k] or 0) for k in ['urea_kg', 'dap_kg', 'mop_kg', 'ssp_kg', 'npk_10_26_26_kg', 'npk_12_32_16_kg', 'nps_20_20_0_13_kg', 'ammonium_sulphate_kg', 'ammonium_chloride_kg', 'npk_17_17_17_kg', 'npks_16_20_0_13_kg', 'npk_16_16_16_kg', 'npk_12_61_0_kg', 'npks_15_15_15_09_kg', 'npk_19_19_19_kg', 'mono_11_52_0_kg', 'calcium_ammonium_nitrate_kg'])
    org_sum = sum(float(r[k] or 0) for k in ['farm_yard_manure_kg', 'vermicompost_kg'])
    
    # Elemental N calculation:
    # Urea: 46% N
    # DAP: 18% N
    # NPS 20:20:0:13: 20% N
    # NPK 10:26:26: 10% N
    # NPK 12:32:16: 12% N
    # Ammonium Sulphate: 21% N
    # Ammonium Chloride: 25% N
    # NPK 17:17:17: 17% N
    # NPKS 16:20:0:13: 16% N
    # NPK 16:16:16: 16% N
    # NPK 12:61:0: 12% N
    # NPKS 15:15:15:09: 15% N
    # NPK 19:19:19: 19% N
    # Mono 11:52:0: 11% N
    # CAN: 25% N
    n_elemental = (
        float(r['urea_kg'] or 0)*0.46 +
        float(r['dap_kg'] or 0)*0.18 +
        float(r['nps_20_20_0_13_kg'] or 0)*0.20 +
        float(r['npk_10_26_26_kg'] or 0)*0.10 +
        float(r['npk_12_32_16_kg'] or 0)*0.12 +
        float(r['ammonium_sulphate_kg'] or 0)*0.21 +
        float(r['ammonium_chloride_kg'] or 0)*0.25 +
        float(r['npk_17_17_17_kg'] or 0)*0.17 +
        float(r['npks_16_20_0_13_kg'] or 0)*0.16 +
        float(r['npk_16_16_16_kg'] or 0)*0.16 +
        float(r['npk_12_61_0_kg'] or 0)*0.12 +
        float(r['npks_15_15_15_09_kg'] or 0)*0.15 +
        float(r['npk_19_19_19_kg'] or 0)*0.19 +
        float(r['mono_11_52_0_kg'] or 0)*0.11 +
        float(r['calcium_ammonium_nitrate_kg'] or 0)*0.25
    )
    print(f"   -> Chem fertilizer sum (kg product): {chem_sum:.2f} | Org sum: {org_sum:.2f} | Elemental N (kg N): {n_elemental:.2f}")

db.close()

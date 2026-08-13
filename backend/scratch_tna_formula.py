import sys
sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

rows = db.execute(text("SELECT * FROM raw.sugarcane_survey WHERE tna IS NOT NULL LIMIT 20")).mappings().all()

print("--- ANALYZING RAW TNA FORMULA ---")
for r in rows:
    raw_tna = float(r['tna'])
    # Let's test various combinations:
    # Urea: 46% N -> 0.46
    # DAP: 18% N -> 0.18
    # MOP: 60% K2O -> 0.60
    # SSP: 16% P2O5 -> 0.16
    # NPK 10:26:26: 10 + 26 + 26 = 62% total nutrients -> 0.62? Or N=0.10, P=0.26, K=0.26?
    # NPS 20:20:0:13: 20 + 20 + 13 = 53% total nutrients -> 0.53? Or N=0.20, P=0.20, S=0.13?
    
    # Total nutrients (N + P2O5 + K2O + S):
    # Urea (46% N) -> 0.46
    # DAP (18% N, 46% P2O5) -> 0.64
    # MOP (60% K2O) -> 0.60
    # SSP (16% P2O5, 11% S, 19% Ca) -> 0.16 or 0.27
    # NPK 10:26:26 -> 0.62
    # NPS 20:20:0:13 -> 0.53
    # Amm Sulphate (20.6% N, 24% S) -> 0.446 or 0.206
    # NPK 17:17:17 -> 0.51
    # NPK 16:16:16 -> 0.48
    # NPK 19:19:19 -> 0.57
    
    tot_nutrients = (
        float(r['urea_kg'] or 0) * 0.46 +
        float(r['dap_kg'] or 0) * 0.64 +
        float(r['mop_kg'] or 0) * 0.60 +
        float(r['ssp_kg'] or 0) * 0.16 +
        float(r['npk_10_26_26_kg'] or 0) * 0.62 +
        float(r['nps_20_20_0_13_kg'] or 0) * 0.53 +
        float(r['ammonium_sulphate_kg'] or 0) * 0.206 +
        float(r['npk_17_17_17_kg'] or 0) * 0.51 +
        float(r['npk_16_16_16_kg'] or 0) * 0.48 +
        float(r['npk_19_19_19_kg'] or 0) * 0.57 +
        float(r['calcium_ammonium_nitrate_kg'] or 0) * 0.25
    )
    print(f"Farmer: {r['farmer_code']} | Raw TNA: {raw_tna:10.4f} | Calc Total Nutrients: {tot_nutrients:10.4f} | Diff: {raw_tna - tot_nutrients:8.4f}")

db.close()

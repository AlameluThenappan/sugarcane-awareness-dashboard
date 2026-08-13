import csv

with open('d:/sugarcane_survey/backend/finalized_survey_clean.csv', encoding='utf-8') as f:
    reader = list(csv.DictReader(f))

print("--- TESTING TNA FORMULA FROM CSV ---")
# Let's inspect rows with tna
sample = [r for r in reader if r.get('tna') and float(r['tna']) > 0][:10]

for r in sample:
    tna_val = float(r['tna'])
    u = float(r['urea_kg'] or 0)
    d = float(r['dap_kg'] or 0)
    ssp = float(r['ssp_kg'] or 0)
    mop = float(r['mop_kg'] or 0)
    npk_10 = float(r['npk_10_26_26_kg'] or 0)
    nps = float(r['nps_20_20_0_13_kg'] or 0)
    amm_s = float(r['ammonium_sulphate_kg'] or 0)
    npk_17 = float(r['npk_17_17_17_kg'] or 0)
    npk_19 = float(r['npk_19_19_19_kg'] or 0)
    fym = float(r['farm_yard_manure_kg'] or 0)
    press = float(r['press_mud_kg'] or 0)
    vermi = float(r['vermicompost_kg'] or 0)
    poultry = float(r['poultry_manure_kg'] or 0)
    
    # Check if tna matches (chem_nutrients + org_nutrients):
    # Let's print all values
    print(f"Farmer: {r['farmer_code']} | TNA: {tna_val}")
    print(f"   Urea:{u}, DAP:{d}, SSP:{ssp}, MOP:{mop}, NPK10:{npk_10}, NPS:{nps}, AmmS:{amm_s}, NPK17:{npk_17}, NPK19:{npk_19}")
    print(f"   FYM:{fym}, Press:{press}, Vermi:{vermi}, Poultry:{poultry}")

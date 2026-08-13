import os
import json
import sys

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import text
from app.database import SessionLocal
from app.services.dashboard_data import load_base_rows, load_fertilizer_rows

db = SessionLocal()

print("=== SCHEMAS & TABLES ===")
tables = db.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('survey', 'raw')")).fetchall()
for t in tables:
    print(f"Table: {t[0]}.{t[1]}")
    cols = db.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='{t[0]}' AND table_name='{t[1]}'")).fetchall()
    for c in cols:
        print(f"  - {c[0]}: {c[1]}")

rows = load_base_rows()
fert_rows = load_fertilizer_rows()

print(f"\nTotal Surveys (Base Rows): {len(rows)}")
print(f"Total Fertilizer Rows: {len(fert_rows)}")

farmer_ids = {r["farmer_id"] for r in rows}
print(f"Unique Farmers in base_rows: {len(farmer_ids)}")

print("\n--- SAMPLE ROW KEYS ---")
if rows:
    print(list(rows[0].keys()))

print("\n--- DISTINCT CROP TYPES ---")
crop_counts = {}
for r in rows:
    val = r["crop_type"]
    crop_counts[val] = crop_counts.get(val, 0) + 1
print(crop_counts)

print("\n--- DISTINCT NORMAL YEAR FLAGS ---")
ny_counts = {}
for r in rows:
    val = r["normal_year_flag"]
    ny_counts[val] = ny_counts.get(val, 0) + 1
print(ny_counts)

print("\n--- DISTINCT IRRIGATION TYPES ---")
irr_counts = {}
for r in rows:
    val = r["irrigation_type"]
    irr_counts[val] = irr_counts.get(val, 0) + 1
print(irr_counts)

print("\n--- FERTILIZER NAMES & TOTAL QUANTITY ---")
fert_summary = {}
for r in fert_rows:
    fname = r["fertilizer_name"]
    qty = float(r["quantity_kg"] or 0)
    if fname not in fert_summary:
        fert_summary[fname] = {"count": 0, "total_kg": 0.0, "min_kg": qty, "max_kg": qty}
    fert_summary[fname]["count"] += 1
    fert_summary[fname]["total_kg"] += qty
    fert_summary[fname]["min_kg"] = min(fert_summary[fname]["min_kg"], qty)
    fert_summary[fname]["max_kg"] = max(fert_summary[fname]["max_kg"], qty)

for fname, stat in sorted(fert_summary.items(), key=lambda x: x[1]['total_kg'], reverse=True):
    print(f"{fname:30s} | Count: {stat['count']:4d} | Total: {stat['total_kg']:10.2f} kg | Min: {stat['min_kg']:6.2f} | Max: {stat['max_kg']:8.2f}")

print("\n--- YIELD DATA ANALYSIS ---")
yields = [r["yield_tonnes_ha"] for r in rows if r["yield_tonnes_ha"] is not None]
print(f"Total rows with yield_tonnes_ha != None: {len(yields)}")
print(f"Yields == 0: {sum(1 for y in yields if y == 0)}")
print(f"Yields > 0: {sum(1 for y in yields if y > 0)}")
if yields:
    print(f"Sum yield: {sum(yields):.2f}, Simple Avg (all != None): {sum(yields)/len(yields):.2f}")
    valid_y = [y for y in yields if y > 0]
    if valid_y:
        print(f"Sum valid yield: {sum(valid_y):.2f}, Simple Avg (only >0): {sum(valid_y)/len(valid_y):.2f}")

print("\n--- ACREAGE DATA ANALYSIS ---")
acres = [r["total_acreage"] for r in rows if r["total_acreage"] is not None]
ha = [r["land_area_hectare"] for r in rows if r["land_area_hectare"] is not None]
plot_acres = [r["largest_plot_acres"] for r in rows if r["largest_plot_acres"] is not None]

print(f"Total acreage sum: {sum(acres):.2f} ac across {len(acres)} records")
print(f"Land area ha sum: {sum(ha):.2f} ha across {len(ha)} records")
print(f"Largest plot acres sum: {sum(plot_acres):.2f} ac across {len(plot_acres)} records")

print("\n--- CHECK ACKNOWLEDGEMENT IN SURVEAYS TABLE ---")
ack_check = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='surveys'")).fetchall()
print("Surveys columns:", [c[0] for c in ack_check])

db.close()

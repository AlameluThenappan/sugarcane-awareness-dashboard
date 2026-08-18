"""
Verify every converted Postgres function against its FastAPI counterpart.

Run from backend/ with the venv active. The FastAPI server does NOT need to be
running — route functions are called in-process.

    python verify_endpoints.py
"""
import sys
from sqlalchemy import text

sys.stdout.reconfigure(encoding="utf-8")

from app.database import SessionLocal
from app.routes.api_dashboard import (
    summary, analytics_raw, identity_page, land_page, yield_page, ratoon_page,
    fertilizer_page, climate_page, longtail_fertilizer_page,
    longtail_organic_page, villages, farmer_locations,
)
from app.routes.api_surveys import list_surveys, survey_profile

# 0.011 tolerance: Python rounds ties to even, Postgres rounds half away from
# zero, so values can differ by exactly 0.01 on the second decimal.
TOL = 0.011


def rpc(db, fn, args=""):
    return db.execute(text(f"select public.{fn}({args})")).scalar()


def near(a, b):
    try:
        return abs(float(a) - float(b)) < TOL
    except (TypeError, ValueError):
        return a == b


def cmp_value(path, a, b, bad):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            cmp_value(f"{path}.{k}", a.get(k, "<missing>"), b.get(k, "<missing>"), bad)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            bad.append((path, f"len={len(a)}", f"len={len(b)}"))
            return
        for i, (x, y) in enumerate(zip(a, b)):
            cmp_value(f"{path}[{i}]", x, y, bad)
    elif not near(a, b):
        bad.append((path, a, b))


def check(name, py, sql):
    bad = []
    cmp_value(name, py, sql, bad)
    print(f"\n=== {name} ===")
    if not bad:
        print("MATCH")
    else:
        print(f"{len(bad)} mismatches (first 15 shown)")
        for p, a, b in bad[:15]:
            print(f"  {p}\n      python={a!r}\n      sql   ={b!r}")
    return not bad


ENDPOINTS = [
    ("summary",        summary,        "summary"),
    ("analytics_raw",  analytics_raw,  "analytics_raw"),
    ("identity_page",  identity_page,  "identity_page"),
    ("land_page",      land_page,      "land_page"),
    ("yield_page",     yield_page,     "yield_page"),
    ("ratoon_page",    ratoon_page,    "ratoon_page"),
    ("fertilizer_page", fertilizer_page, "fertilizer_page"),
    ("climate_page",    climate_page,    "climate_page"),
    ("longtail_fertilizer_page", longtail_fertilizer_page, "longtail_fertilizer_page"),
    ("longtail_organic_page",    longtail_organic_page,    "longtail_organic_page"),
    ("villages",         villages,        "villages"),
    ("farmer_locations", farmer_locations, "farmer_locations"),
    ("list_surveys",     list_surveys,     "list_surveys"),
]

# Endpoints taking an argument: (label, python_callable, sql_name, arg_literal, py_arg)
PARAM_ENDPOINTS = [
    ("survey_profile", survey_profile, "survey_profile", "1", 1),
]

if __name__ == "__main__":
    db = SessionLocal()
    results = {}
    try:
        for label, pyfn, sqlfn in ENDPOINTS:
            try:
                results[label] = check(label, pyfn(), rpc(db, sqlfn))
            except Exception as e:
                print(f"\n=== {label} ===\nERROR: {e}")
                results[label] = False

        for label, pyfn, sqlfn, arg, pyarg in PARAM_ENDPOINTS:
            try:
                results[label] = check(label, pyfn(pyarg), rpc(db, sqlfn, arg))
            except Exception as e:
                print(f"\n=== {label} ===\nERROR: {e}")
                results[label] = False
    finally:
        db.close()

    print("\n" + "-" * 50)
    for k, v in results.items():
        print(f"  {'PASS' if v else 'FAIL'}  {k}")
    ok = all(results.values())
    print("-" * 50)
    print("ALL MATCH" if ok else "MISMATCHES FOUND")
    sys.exit(0 if ok else 1)
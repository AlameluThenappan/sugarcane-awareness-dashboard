import pandas as pd
import re
from sqlalchemy import text
from app.database import SessionLocal

EXCEL_FILE = "data/finalized data.xlsx"


def to_bool(v):
    if pd.isna(v):
        return None

    if isinstance(v, bool):
        return v

    if isinstance(v, (int, float)):
        return bool(v)

    v = str(v).strip().lower()

    if v in ["yes", "true", "1"]:
        return True

    if v in ["no", "false", "0"]:
        return False

    return None


def to_float(v):
    if pd.isna(v):
        return None

    try:
        return float(v)
    except:
        return None


def to_int(v):
    if pd.isna(v):
        return None

    try:
        return int(float(v))
    except:
        return None

def clean(v):
    if pd.isna(v):
        return None

    v = str(v).strip()

    if v == "":
        return None

    return v

def clean_name(v):
    if pd.isna(v):
        return None

    name = str(v).strip()

    if name == "":
        return None

    return " ".join(word.capitalize() for word in name.split())

def clean_phone(v):
    if pd.isna(v):
        return None

    phone = str(v).strip()

    # Take only the first number if multiple numbers exist
    phone = phone.split(",")[0]

    # Remove +91
    phone = phone.replace("+91", "")

    # Remove all non-digits
    phone = re.sub(r"\D", "", phone)

    # Remove leading 91 if present
    if phone.startswith("91") and len(phone) > 10:
        phone = phone[2:]

    # Keep only first 10 digits
    phone = phone[:10]

    if len(phone) != 10:
        return None

    return phone

def import_excel():

    print("Reading Excel...")

    df = pd.read_excel(EXCEL_FILE)

    print("Found", len(df), "records")

    db = SessionLocal()

    try:

        for _, row in df.iterrows():

            data = {

                "collection_date": clean(row["collection_date"]),
                "unique_id": clean(row["unique_id"]),

                "employee_name": clean_name(row["employee_name"]),
                "enumerator_designation": clean(row["enumerator_designation"]),
                "organization_name": clean(row["organization_name"]),

                "state": clean(row["state"]),
                "district_name": clean(row["district_name"]),
                "block_name": clean(row["block_name"]),
                "village_name": clean(row["village_name"]),

                "farmer_code": clean(row["farmer_code"]),
                "farmer_name": clean_name(row["farmer_name"]),

                "consent_response": to_bool(row["consent_response"]),

                "age": clean(row["age"]),
                "education": clean(row["education"]),
                "mobile_number": clean_phone(row["mobile_number"]),

                "survey_year": to_int(row["survey_year"]),

                "crop": clean(row["crop"]),
                "normal_year_flag": clean(row["normal_year_flag"]),

                "climatic_events": clean(row["climatic_events"]),

                "event_erratic_rainfall": to_bool(row["event_erratic_rainfall"]),
                "event_cyclone": to_bool(row["event_cyclone"]),
                "event_drought": to_bool(row["event_drought"]),
                "event_flood": to_bool(row["event_flood"]),
                "event_none": to_bool(row["event_none"]),

                "impact_stages": clean(row["impact_stages"]),

                "stage_sprouting": to_bool(row["stage_sprouting"]),
                "stage_tillering": to_bool(row["stage_tillering"]),
                "stage_grand_growth": to_bool(row["stage_grand_growth"]),
                "stage_maturity": to_bool(row["stage_maturity"]),

                "total_acreage": to_float(row["total_acreage"]),
                "largest_plot_acres": to_float(row["largest_plot_acres"]),
                "land_area_hectare": to_float(row["land_area_hectare"]),

                "irrigation_type": clean(row["irrigation_type"]),
                "fertilizer_application_method": clean(row["fertilizer_application_method"]),

                "method_broadcasting": to_bool(row["method_broadcasting"]),
                "method_surface_fertigation": to_bool(row["method_surface_fertigation"]),
                "method_sub_surface_fertigation": to_bool(row["method_sub_surface_fertigation"]),
                "method_foliar_application": to_bool(row["method_foliar_application"]),

                "crop_type": clean(row["crop_type"]),
                "ratoon_type": clean(row["ratoon_type"]),
                "next_ratoon_wish": clean(row["next_ratoon_wish"]),

                "yield_tonnes": to_float(row["yield_tonnes"]),
                "yield_tonnes_ha": to_float(row["yield_tonnes_ha"]),

                "urea_kg": to_float(row["urea_kg"]),
                "dap_kg": to_float(row["dap_kg"]),
                "ssp_kg": to_float(row["ssp_kg"]),
                "mop_kg": to_float(row["mop_kg"]),

                "npk_10_26_26_kg": to_float(row["npk_10_26_26_kg"]),
                "npk_12_32_16_kg": to_float(row["npk_12_32_16_kg"]),
                "nps_20_20_0_13_kg": to_float(row["nps_20_20_0_13_kg"]),

                "ammonium_sulphate_kg": to_float(row["ammonium_sulphate_kg"]),
                "ammonium_chloride_kg": to_float(row["ammonium_chloride_kg"]),

                "npk_17_17_17_kg": to_float(row["npk_17_17_17_kg"]),
                "npks_16_20_0_13_kg": to_float(row["npks_16_20_0_13_kg"]),
                "npk_16_16_16_kg": to_float(row["npk_16_16_16_kg"]),
                "npk_12_61_0_kg": to_float(row["npk_12_61_0_kg"]),
                "npks_15_15_15_09_kg": to_float(row["npks_15_15_15_09_kg"]),
                "npk_19_19_19_kg": to_float(row["npk_19_19_19_kg"]),

                "mono_11_52_0_kg": to_float(row["mono_11_52_0_kg"]),
                "calcium_ammonium_nitrate_kg": to_float(row["calcium_ammonium_nitrate_kg"]),

                "farm_yard_manure_kg": to_float(row["farm_yard_manure_kg"]),
                "vermicompost_kg": to_float(row["vermicompost_kg"]),
                "goat_sheep_manure_kg": to_float(row["goat_sheep_manure_kg"]),
                "poultry_manure_kg": to_float(row["poultry_manure_kg"]),
                "press_mud_kg": to_float(row["press_mud_kg"]),
                "jeevamrut_kg": to_float(row["jeevamrut_kg"]),

                "tna": clean(row["tna"])
            }

            db.execute(
    text("""
        INSERT INTO raw.sugarcane_survey (

            collection_date,
            unique_id,
            employee_name,
            enumerator_designation,
            organization_name,
            state,
            district_name,
            block_name,
            village_name,
            farmer_code,
            farmer_name,
            consent_response,

            age,
            education,
            mobile_number,
            survey_year,
            crop,

            normal_year_flag,
            climatic_events,

            event_erratic_rainfall,
            event_cyclone,
            event_drought,
            event_flood,
            event_none,

            impact_stages,

            stage_sprouting,
            stage_tillering,
            stage_grand_growth,
            stage_maturity,

            total_acreage,
            largest_plot_acres,
            land_area_hectare,

            irrigation_type,
            fertilizer_application_method,

            method_broadcasting,
            method_surface_fertigation,
            method_sub_surface_fertigation,
            method_foliar_application,

            crop_type,
            ratoon_type,
            next_ratoon_wish,

            yield_tonnes,
            yield_tonnes_ha,

            urea_kg,
            dap_kg,
            ssp_kg,
            mop_kg,

            npk_10_26_26_kg,
            npk_12_32_16_kg,
            nps_20_20_0_13_kg,

            ammonium_sulphate_kg,
            ammonium_chloride_kg,

            npk_17_17_17_kg,
            npks_16_20_0_13_kg,
            npk_16_16_16_kg,
            npk_12_61_0_kg,
            npks_15_15_15_09_kg,
            npk_19_19_19_kg,

            mono_11_52_0_kg,
            calcium_ammonium_nitrate_kg,

            farm_yard_manure_kg,
            vermicompost_kg,
            goat_sheep_manure_kg,
            poultry_manure_kg,
            press_mud_kg,
            jeevamrut_kg,

            tna

        )

        VALUES (

            :collection_date,
            :unique_id,
            :employee_name,
            :enumerator_designation,
            :organization_name,
            :state,
            :district_name,
            :block_name,
            :village_name,
            :farmer_code,
            :farmer_name,
            :consent_response,

            :age,
            :education,
            :mobile_number,
            :survey_year,
            :crop,

            :normal_year_flag,
            :climatic_events,

            :event_erratic_rainfall,
            :event_cyclone,
            :event_drought,
            :event_flood,
            :event_none,

            :impact_stages,

            :stage_sprouting,
            :stage_tillering,
            :stage_grand_growth,
            :stage_maturity,

            :total_acreage,
            :largest_plot_acres,
            :land_area_hectare,

            :irrigation_type,
            :fertilizer_application_method,

            :method_broadcasting,
            :method_surface_fertigation,
            :method_sub_surface_fertigation,
            :method_foliar_application,

            :crop_type,
            :ratoon_type,
            :next_ratoon_wish,

            :yield_tonnes,
            :yield_tonnes_ha,

            :urea_kg,
            :dap_kg,
            :ssp_kg,
            :mop_kg,

            :npk_10_26_26_kg,
            :npk_12_32_16_kg,
            :nps_20_20_0_13_kg,

            :ammonium_sulphate_kg,
            :ammonium_chloride_kg,

            :npk_17_17_17_kg,
            :npks_16_20_0_13_kg,
            :npk_16_16_16_kg,
            :npk_12_61_0_kg,
            :npks_15_15_15_09_kg,
            :npk_19_19_19_kg,

            :mono_11_52_0_kg,
            :calcium_ammonium_nitrate_kg,

            :farm_yard_manure_kg,
            :vermicompost_kg,
            :goat_sheep_manure_kg,
            :poultry_manure_kg,
            :press_mud_kg,
            :jeevamrut_kg,

            :tna

        )

        ON CONFLICT (unique_id) DO NOTHING
    """),
    data
)

        db.commit()
        print("✅ Import Completed Successfully")

    except Exception as e:
        db.rollback()
        print("\n❌ Import Failed")
        print(e)

    finally:
        db.close()


if __name__ == "__main__":
    import_excel()
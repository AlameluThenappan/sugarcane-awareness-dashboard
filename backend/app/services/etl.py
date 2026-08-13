from sqlalchemy import text
from app.database import SessionLocal


def clean_name(name):
    """
    Converts:
    madheswaran k
    MADHESWARAN K
    Madheswaran k

    into

    Madheswaran K
    """
    if name is None:
        return None

    return " ".join(str(name).strip().title().split())


def run_etl():

    db = SessionLocal()

    try:

        rows = db.execute(
            text("""
                SELECT *
                FROM raw.sugarcane_survey
                ORDER BY id;
            """)
        ).mappings().all()

        print(f"Found {len(rows)} raw records")

        users_inserted = 0

        for row in rows:

            employee_name = clean_name(row["employee_name"])

            # Check whether user already exists
            exists = db.execute(
                text("""
                    SELECT user_id
                    FROM survey.users
                    WHERE employee_name = :employee_name
                """),
                {
                    "employee_name": employee_name
                }
            ).fetchone()

            if exists:
                continue

            # Insert new user
            db.execute(
                text("""
                    INSERT INTO survey.users
                    (
                        employee_name,
                        designation,
                        organization_name,
                        role
                    )
                    VALUES
                    (
                        :employee_name,
                        :designation,
                        :organization_name,
                        'ENUMERATOR'
                    )
                """),
                {
                    "employee_name": employee_name,
                    "designation": row["enumerator_designation"],
                    "organization_name": row["organization_name"]
                }
            )

            users_inserted += 1

        db.commit()

        print(f"✅ Users inserted : {users_inserted}")

        # ---------------- FARMERS ----------------

        farmers_inserted = 0

        for row in rows:

            farmer_code = str(row["farmer_code"]).strip().upper()

            exists = db.execute(
                text("""
                    SELECT farmer_id
                    FROM survey.farmers
                    WHERE farmer_code = :farmer_code
                """),
                {
                    "farmer_code": farmer_code
                }
            ).fetchone()

            if exists:
                continue
            
            state = row["state"]

            if state is None or str(state).strip() == "":
                state = "Tamil Nadu"
            db.execute(
                text("""
                    INSERT INTO survey.farmers
                    (
                        farmer_code,
                        farmer_name,
                        age,
                        education,
                        mobile_number,
                        village_name,
                        block_name,
                        district_name,
                        state
                    )

                    VALUES
                    (
                        :farmer_code,
                        :farmer_name,
                        :age,
                        :education,
                        :mobile_number,
                        :village_name,
                        :block_name,
                        :district_name,
                        :state
                    )
                """),
                {
                    "farmer_code": farmer_code,
                    "farmer_name": clean_name(row["farmer_name"]),
                    "age": row["age"],
                    "education": row["education"],
                    "mobile_number": row["mobile_number"],
                    "village_name": row["village_name"],
                    "block_name": row["block_name"],
                    "district_name": row["district_name"],
                    "state": state
                }
            )

            farmers_inserted += 1

        db.commit()

        print(f"✅ Farmers inserted : {farmers_inserted}")
        
                # ---------------- SURVEYS ----------------

        surveys_inserted = 0

        for row in rows:

            unique_id = str(row["unique_id"]).strip()

            exists = db.execute(
                text("""
                    SELECT survey_id
                    FROM survey.surveys
                    WHERE unique_id = :unique_id
                """),
                {"unique_id": unique_id}
            ).fetchone()

            if exists:
                continue

            farmer = db.execute(
                text("""
                    SELECT farmer_id
                    FROM survey.farmers
                    WHERE farmer_code = :farmer_code
                """),
                {
                    "farmer_code": str(row["farmer_code"]).strip().upper()
                }
            ).fetchone()

            user = db.execute(
                text("""
                    SELECT user_id
                    FROM survey.users
                    WHERE LOWER(employee_name)=LOWER(:employee_name)
                """),
                {
                    "employee_name": clean_name(row["employee_name"])
                }
            ).fetchone()

            if farmer is None or user is None:
                print(f"Skipping {unique_id}")
                continue

            db.execute(
                text("""
                    INSERT INTO survey.surveys
                    (
                        unique_id,
                        farmer_id,
                        user_id,
                        collection_date,
                        survey_year,
                        crop,
                        consent_response,
                        source
                    )

                    VALUES
                    (
                        :unique_id,
                        :farmer_id,
                        :user_id,
                        :collection_date,
                        :survey_year,
                        :crop,
                        :consent_response,
                        'KOBO'
                    )
                """),
                {
                    "unique_id": unique_id,
                    "farmer_id": farmer[0],
                    "user_id": user[0],
                    "collection_date": row["collection_date"],
                    "survey_year": row["survey_year"],
                    "crop": row["crop"],
                    "consent_response": row["consent_response"]
                }
            )

            surveys_inserted += 1

        db.commit()

        print(f"✅ Surveys inserted : {surveys_inserted}")

                # ---------------- LAND DETAILS ----------------

        land_inserted = 0

        for row in rows:

            survey = db.execute(
                text("""
                    SELECT survey_id
                    FROM survey.surveys
                    WHERE unique_id=:unique_id
                """),
                {
                    "unique_id": str(row["unique_id"]).strip()
                }
            ).fetchone()

            if survey is None:
                continue

            exists = db.execute(
                text("""
                    SELECT land_id
                    FROM survey.land_details
                    WHERE survey_id=:survey_id
                """),
                {
                    "survey_id": survey[0]
                }
            ).fetchone()

            if exists:
                continue

            db.execute(
                text("""
                    INSERT INTO survey.land_details
                    (
                        survey_id,
                        total_acreage,
                        largest_plot_acres,
                        land_area_hectare,
                        irrigation_type
                    )

                    VALUES
                    (
                        :survey_id,
                        :total_acreage,
                        :largest_plot_acres,
                        :land_area_hectare,
                        :irrigation_type
                    )
                """),
                {
                    "survey_id": survey[0],
                    "total_acreage": row["total_acreage"],
                    "largest_plot_acres": row["largest_plot_acres"],
                    "land_area_hectare": row["land_area_hectare"],
                    "irrigation_type": row["irrigation_type"]
                }
            )

            land_inserted += 1

        db.commit()

        print(f"✅ Land records inserted : {land_inserted}")

                # ---------------- CLIMATE EVENTS ----------------

        climate_inserted = 0

        for row in rows:

            survey = db.execute(
                text("""
                    SELECT survey_id
                    FROM survey.surveys
                    WHERE unique_id=:unique_id
                """),
                {
                    "unique_id": str(row["unique_id"]).strip()
                }
            ).fetchone()

            if survey is None:
                continue

            exists = db.execute(
                text("""
                    SELECT climate_id
                    FROM survey.climate_events
                    WHERE survey_id=:survey_id
                """),
                {
                    "survey_id": survey[0]
                }
            ).fetchone()

            if exists:
                continue

            db.execute(
                text("""
                    INSERT INTO survey.climate_events
                    (
                        survey_id,
                        normal_year_flag,
                        climatic_events,
                        impact_stages,
                        event_erratic_rainfall,
                        event_cyclone,
                        event_drought,
                        event_flood,
                        event_none,
                        stage_sprouting,
                        stage_tillering,
                        stage_grand_growth,
                        stage_maturity
                    )
                    VALUES
                    (
                        :survey_id,
                        :normal_year_flag,
                        :climatic_events,
                        :impact_stages,
                        :event_erratic_rainfall,
                        :event_cyclone,
                        :event_drought,
                        :event_flood,
                        :event_none,
                        :stage_sprouting,
                        :stage_tillering,
                        :stage_grand_growth,
                        :stage_maturity
                    )
                """),
                {
                    "survey_id": survey[0],
                    "normal_year_flag": row["normal_year_flag"],
                    "climatic_events": row["climatic_events"],
                    "impact_stages": row["impact_stages"],
                    "event_erratic_rainfall": row["event_erratic_rainfall"],
                    "event_cyclone": row["event_cyclone"],
                    "event_drought": row["event_drought"],
                    "event_flood": row["event_flood"],
                    "event_none": row["event_none"],
                    "stage_sprouting": row["stage_sprouting"],
                    "stage_tillering": row["stage_tillering"],
                    "stage_grand_growth": row["stage_grand_growth"],
                    "stage_maturity": row["stage_maturity"]
                }
            )

            climate_inserted += 1

        db.commit()

        print(f"✅ Climate records inserted : {climate_inserted}")

                # ---------------- CROP YIELD ----------------

        yield_inserted = 0

        for row in rows:

            survey = db.execute(
                text("""
                    SELECT survey_id
                    FROM survey.surveys
                    WHERE unique_id=:unique_id
                """),
                {
                    "unique_id": str(row["unique_id"]).strip()
                }
            ).fetchone()

            if survey is None:
                continue

            exists = db.execute(
                text("""
                    SELECT yield_id
                    FROM survey.crop_yield
                    WHERE survey_id=:survey_id
                """),
                {
                    "survey_id": survey[0]
                }
            ).fetchone()

            if exists:
                continue

            db.execute(
                text("""
                    INSERT INTO survey.crop_yield
                    (
                        survey_id,
                        crop_type,
                        ratoon_type,
                        next_ratoon_wish,
                        yield_tonnes,
                        yield_tonnes_ha
                    )
                    VALUES
                    (
                        :survey_id,
                        :crop_type,
                        :ratoon_type,
                        :next_ratoon_wish,
                        :yield_tonnes,
                        :yield_tonnes_ha
                    )
                """),
                {
                    "survey_id": survey[0],
                    "crop_type": row["crop_type"],
                    "ratoon_type": row["ratoon_type"],
                    "next_ratoon_wish": row["next_ratoon_wish"],
                    "yield_tonnes": row["yield_tonnes"],
                    "yield_tonnes_ha": row["yield_tonnes_ha"]
                }
            )

            yield_inserted += 1

        db.commit()

        print(f"✅ Crop Yield inserted : {yield_inserted}")

                # ---------------- FERTILIZER APPLICATION ----------------

        fertilizer_columns = {
            "urea_kg": "Urea",
            "dap_kg": "DAP",
            "ssp_kg": "SSP",
            "mop_kg": "MOP",
            "npk_10_26_26_kg": "NPK 10:26:26",
            "npk_12_32_16_kg": "NPK 12:32:16",
            "nps_20_20_0_13_kg": "NPS 20:20:0:13",
            "ammonium_sulphate_kg": "Ammonium Sulphate",
            "ammonium_chloride_kg": "Ammonium Chloride",
            "npk_17_17_17_kg": "NPK 17:17:17",
            "npks_16_20_0_13_kg": "NPKS 16:20:0:13",
            "npk_16_16_16_kg": "NPK 16:16:16",
            "npk_12_61_0_kg": "NPK 12:61:0",
            "npks_15_15_15_09_kg": "NPKS 15:15:15:09",
            "npk_19_19_19_kg": "NPK 19:19:19",
            "mono_11_52_0_kg": "Mono 11:52:0",
            "calcium_ammonium_nitrate_kg": "Calcium Ammonium Nitrate",
            "farm_yard_manure_kg": "Farm Yard Manure",
            "vermicompost_kg": "Vermicompost",
            "goat_sheep_manure_kg": "Goat/Sheep Manure",
            "poultry_manure_kg": "Poultry Manure",
            "press_mud_kg": "Press Mud",
            "jeevamrut_kg": "Jeevamrut"
        }

        fertilizer_inserted = 0

        for row in rows:

            survey = db.execute(
                text("""
                    SELECT survey_id
                    FROM survey.surveys
                    WHERE unique_id=:unique_id
                """),
                {
                    "unique_id": str(row["unique_id"]).strip()
                }
            ).fetchone()

            if survey is None:
                continue

            for column, fertilizer_name in fertilizer_columns.items():

                qty = row[column]

                if qty is None:
                    continue

                try:
                    qty = float(qty)
                except:
                    continue

                if qty <= 0:
                    continue

                db.execute(
                    text("""
                        INSERT INTO survey.fertilizer_application
                        (
                            survey_id,
                            fertilizer_name,
                            quantity_kg,
                            application_method
                        )
                        VALUES
                        (
                            :survey_id,
                            :fertilizer_name,
                            :quantity_kg,
                            :application_method
                        )
                    """),
                    {
                        "survey_id": survey[0],
                        "fertilizer_name": fertilizer_name,
                        "quantity_kg": qty,
                        "application_method": row["fertilizer_application_method"]
                    }
                )

                fertilizer_inserted += 1

        db.commit()

        print(f"✅ Fertilizer records inserted : {fertilizer_inserted}")

        
    except Exception as e:

        db.rollback()
        print("❌", e)

    finally:

        db.close()


if __name__ == "__main__":
    run_etl()
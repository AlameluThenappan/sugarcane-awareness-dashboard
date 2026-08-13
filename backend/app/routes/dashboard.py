from fastapi import APIRouter, Depends
from app.utils.dependencies import get_current_user
from app.utils.dependencies import admin_required
from app.database import SessionLocal
from sqlalchemy import text
from app.utils.dependencies import enumerator_required

router = APIRouter()


@router.get("/me")
def me(current_user=Depends(get_current_user)):

    return {
        "id": current_user["user_id"],
        "name": current_user["employee_name"],
        "role": current_user["role"],
        "email": current_user["email"]
    }

@router.get("/stats")
def dashboard_stats(current_user=Depends(admin_required)):

    db = SessionLocal()

    try:

        users = db.execute(
            text("SELECT COUNT(*) FROM survey.users")
        ).scalar()

        farmers = db.execute(
            text("SELECT COUNT(*) FROM survey.farmers")
        ).scalar()

        surveys = db.execute(
            text("SELECT COUNT(*) FROM survey.surveys")
        ).scalar()

        climate = db.execute(
            text("SELECT COUNT(*) FROM survey.climate_events")
        ).scalar()

        fertilizer = db.execute(
            text("SELECT COUNT(*) FROM survey.fertilizer_application")
        ).scalar()

        crop = db.execute(
            text("SELECT COUNT(*) FROM survey.crop_yield")
        ).scalar()

        return {
            "users": users,
            "farmers": farmers,
            "surveys": surveys,
            "climate_records": climate,
            "fertilizer_records": fertilizer,
            "crop_yield_records": crop
        }

    finally:
        db.close() 
@router.get("/my-surveys")
def my_surveys(current_user=Depends(enumerator_required)):

    db = SessionLocal()

    try:

        surveys = db.execute(
            text("""
                SELECT
                    s.survey_id,
                    s.collection_date,
                    s.crop,
                    f.farmer_name,
                    f.village_name,
                    f.block_name,
                    f.district_name
                FROM survey.surveys s
                JOIN survey.farmers f
                    ON s.farmer_id = f.farmer_id
                WHERE s.user_id = :user_id
                ORDER BY s.collection_date DESC
            """),
            {
                "user_id": current_user["user_id"]
            }
        ).mappings().all()

        return surveys

    finally:
        db.close()
@router.get("/my-farmers")
def my_farmers(current_user=Depends(enumerator_required)):

    db = SessionLocal()

    try:

        farmers = db.execute(
            text("""
                SELECT DISTINCT
                    f.farmer_id,
                    f.farmer_code,
                    f.farmer_name,
                    f.mobile_number,
                    f.village_name,
                    f.block_name,
                    f.district_name
                FROM survey.farmers f
                JOIN survey.surveys s
                    ON f.farmer_id = s.farmer_id
                WHERE s.user_id = :user_id
                ORDER BY f.farmer_name
            """),
            {
                "user_id": current_user["user_id"]
            }
        ).mappings().all()

        return farmers

    finally:
        db.close()
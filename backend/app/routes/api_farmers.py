from fastapi import APIRouter
from sqlalchemy import text

from app.database import SessionLocal

router = APIRouter()


@router.get("/")
def list_farmers():
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    farmer_id, farmer_code, farmer_name, age, education,
                    mobile_number, village_name, block_name, district_name, state
                FROM survey.farmers
                ORDER BY farmer_name
                """
            )
        ).mappings().all()
        return [dict(r) for r in rows]
    finally:
        db.close()
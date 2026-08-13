from datetime import timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import SessionLocal
from app.utils.auth import verify_password, create_access_token
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(data: LoginRequest):

    db = SessionLocal()

    try:

        user = db.execute(
            text("""
                SELECT
                    user_id,
                    employee_name,
                    email,
                    role,
                    password_hash,
                    active
                FROM survey.users
                WHERE email = :email
            """),
            {
                "email": data.email
            }
        ).mappings().first()

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not user["active"]:
            raise HTTPException(
                status_code=403,
                detail="Account is disabled"
            )

        if not verify_password(
            data.password,
            user["password_hash"]
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token = create_access_token(
            {
                "sub": str(user["user_id"]),
                "role": user["role"],
                "name": user["employee_name"]
            }
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["user_id"],
                "name": user["employee_name"],
                "email": user["email"],
                "role": user["role"]
            }
        }

    finally:
        db.close()
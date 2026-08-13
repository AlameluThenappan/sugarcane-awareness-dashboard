from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import text

from app.config import SECRET_KEY, ALGORITHM
from app.database import SessionLocal

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload["sub"])

    except JWTError as e:
        print("JWT ERROR:", repr(e))
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    db = SessionLocal()

    try:

        user = db.execute(
            text("""
                SELECT *
                FROM survey.users
                WHERE user_id = :id
            """),
            {
                "id": user_id
            }
        ).mappings().first()

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return user

    finally:
        db.close()


def admin_required(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


def enumerator_required(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "ENUMERATOR":
        raise HTTPException(
            status_code=403,
            detail="Enumerator access required"
        )

    return current_user
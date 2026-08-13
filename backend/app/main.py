from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.routes.webhook import router as webhook_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.api_dashboard import router as api_dashboard_router
from app.routes.api_surveys import router as api_surveys_router
from app.routes.api_farmers import router as api_farmers_router
from app.utils.dependencies import get_current_user

app = FastAPI(
    title="Sugarcane Survey API",
    version="1.0.0"
)

# Allows the Vite dev server (and any other origin, for now) to call this API.
# Tighten allow_origins to your real frontend URL before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    webhook_router,
    prefix="/webhook",
    tags=["Webhook"]
)

app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"]
)
app.include_router(
    dashboard_router,
    prefix="/dashboard",
    tags=["Dashboard"]
)

# Endpoints consumed by the frontend's src/app/lib/api.ts
# All three require a valid login token (Authorization: Bearer <token>)
app.include_router(
    api_dashboard_router,
    prefix="/api/dashboard",
    tags=["API - Dashboard Data"],
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    api_surveys_router,
    prefix="/api/surveys",
    tags=["API - Surveys"],
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    api_farmers_router,
    prefix="/api/farmers",
    tags=["API - Farmers"],
    dependencies=[Depends(get_current_user)],
)

@app.get("/")
def home():

    return {
        "status": "Running",
        "database": "Supabase PostgreSQL"
    }
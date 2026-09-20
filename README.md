# EDF Sugarcane Agricultural Intelligence Dashboard

A full-stack, comprehensive analytics and spatial mapping platform designed to visualize and process sugarcane farmer survey data. 

This project is separated into two main distinct components: a **React/Vite Frontend** that visualizes the intelligence, and a **FastAPI/PostgreSQL Backend** that handles data ingestion, transformation, and API delivery.

---

## 🏗️ 1. The Frontend (User Interface & Visual Analytics)

The frontend is built for extreme performance, complex data visualizations, and an immersive user experience utilizing a dark, nature-inspired Forest theme.

**Location**: `/frontend`

### What it does:
- **Spatial Mapping**: Uses `react-leaflet` to map exact GPS coordinates of surveyed farmers and clusters them by village and block on a district-wide level.
- **Complex Visualizations**: Leverages `Recharts` to build dual-axis charts, scatter plots (Yield vs. Plot Size), and Nitrogen Efficiency Quadrants to visualize farmer productivity.
- **State & UI**: Built with React 18, Vite, and Tailwind CSS. It uses Radix UI primitives for unstyled, highly accessible components (modals, dropdowns, tabs) and Framer Motion for fluid micro-animations.
- **Data Fetching**: Consumes JSON payloads from the Backend API securely using JWT Bearer tokens, providing distinct views depending on whether the logged-in user is an `ADMIN` or `ENUMERATOR`.

### How to run it:
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ 2. The Backend (Data Engine & API)

The backend is a robust API layer that handles the ingestion of raw agricultural survey data, cleans it, normalizes it, and serves it securely to the frontend.

**Location**: `/backend`

### What it does:
- **The ETL Pipeline**: It contains scripts (`services/excel_import.py` and `services/etl.py`) that take raw Excel survey exports (collected via KoboToolbox) and transform them from wide, unstructured rows into clean relational PostgreSQL tables.
- **Database & Architecture**: Powered by **FastAPI** and **PostgreSQL** (hosted on Supabase). Instead of using a heavy ORM, it utilizes SQLAlchemy's `text()` module to execute highly-optimized raw SQL queries for extreme performance.
- **Business Logic & Analytics**: Calculates critical metrics like **Total Nitrogen Applied (TNA)** on the fly by factoring in the specific chemical composition of over 20 different fertilizer variants (Urea, DAP, SSP, etc.).
- **Authentication**: Provides secure JWT-based stateless authentication. It enforces Role-Based Access Control (RBAC), ensuring that enumerators only see farmers they personally surveyed, while admins get a district-wide view.

### How to run it:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*(Requires a `.env` file with `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, and `ACCESS_TOKEN_EXPIRE_MINUTES`)*

---

## 🚀 How They Work Together

1. **Ingestion**: Raw survey data (Excel) is pushed to the Backend.
2. **Processing**: The Backend's ETL pipeline cleans and organizes this data across specialized tables (`farmers`, `land_details`, `crop_yield`, `fertilizer_application`).
3. **Serving**: The Frontend requests analytical slices of this data (e.g., `GET /api/dashboard/summary`). 
4. **Rendering**: The Backend runs complex aggregated SQL queries (often utilizing 15-minute in-memory caching for speed) and returns JSON. The Frontend then renders this as an interactive widget or map.

For more granular documentation on each component, please see:
- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)

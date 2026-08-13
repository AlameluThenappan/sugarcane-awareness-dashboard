# EDF Sugarcane Survey Dashboard UI

This project is a full-stack dashboard for exploring sugarcane survey data, farmer profiles, analytics, and interactive map-based insights.

## Project Overview

The application combines a React frontend with a FastAPI backend to provide a modern interface for viewing and analyzing survey-related information.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy
- Data handling: Excel import and survey data processing

## Run the Project

### 1. Frontend

From the project root, run:

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend

In a separate terminal, run:

```bash
cd backend
pip install -r requirements.txt
.\venv\Scripts\activate 
uvicorn app.main:app --reload
```

## Notes

The dashboard is designed for local development and can be extended with additional analytics and reporting features.

# EDF Sugarcane Agricultural Intelligence Dashboard Specification

This document provides a comprehensive breakdown of all sections, data fields, KPI cards, charts, interactive maps, data tables, analytical widgets, and drill-down details contained within the **EDF Sugarcane Agricultural Intelligence Dashboard**. Use this reference to guide further UI/UX design, data modeling, backend integrations, and component updates.

---

## 🏛️ Navigation & Header Architecture (`TopNav`)

* **Platform Branding**: `EDF Sugarcane - Agricultural Intelligence Platform`
* **Sticky Top Header**: Multi-page route switcher with instant navigation, active visual highlights, and hash-synced URLs (`#/#overview`, `#/#farmers`, `#/#yield`, `#/#fertilizer`, `#/#climate`).
* **Active Theme**: Dark Nature-inspired Forest Theme (`#0B1912` background, `#E5F2EB` text, emerald/mint highlights `#52B788`, gold/amber highlights `#C8973A`, coral alerts `#D4624A`, and slate accents `#3B82B8`).

---

## 📌 Section 01: Overview & Geography (`/overview`)

**Purpose**: District-wide spatial distribution, farmer GPS mapping, macro yield vs. nitrogen efficiency scatter analytics, and core agricultural totals.

### 📊 KPI Cards Row (6 Cards)
| KPI Card | Metric / Field | Unit / Subtext | Visual Styling / Icon |
| :--- | :--- | :--- | :--- |
| **Total Farmers** | Total count of surveyed farmers (`summary.totalFarmers`) | Count | Emerald (`Users` icon) |
| **Total Acreage** | Sum of sugarcane plot acres (`summary.totalAcres`) | Acres (`ac`) | Amber/Gold (`MapPin` icon) |
| **Average Yield** | Mean yield across district (`summary.avgYield`) | Tonnes/Hectare (`t/ha`) | Light Mint (`TrendingUp` icon) |
| **Average Nitrogen** | Mean Total Nitrogen Applied (`summary.avgNitrogen`) | Kilograms (`kg`) | Coral (`FlaskConical` icon) |
| **Crop Split** | Percentage of Ratoon vs. Plant Crop | `% Ratoon` / `% Plant Crop` | Sky Blue (`Leaf` icon) |
| **Climate Impact** | Climate stress ratio | `% Stressed` / `% Normal Year` | Slate (`CloudSun` icon) |

### 🗺️ Interactive Components & Bento Grid
1. **District Spatial Map & Real GPS Farmer Locations** (*Left Column - 70% Width*):
   - Interactive Leaflet/Mapbox Map (`DistrictMap`).
   - Plots farmer GPS coordinates, village cluster points, and block boundaries.
2. **Nitrogen vs. Yield Efficiency Scatter Plot** (*Right Column - 30% Width*):
   - **Type**: Scatter Chart (`ScatterChart`).
   - **X-Axis**: Nitrogen Applied (`kg/ha`).
   - **Y-Axis**: Crop Yield (`t/ha`).
   - **Interactive Elements**: Custom glassmorphism tooltip showing Farmer Name, Village, exact Nitrogen, and Yield values.

### 📐 Map Statistics Strip (3 Summary Widgets)
* **Farmers Surveyed**: Total farmer count badge with emerald icon.
* **Total Villages**: Total count of unique villages surveyed with gold icon.
* **Total Agricultural Blocks**: Total count of blocks (taluks/regions) with sky blue icon.

---

## 🧑‍🌾 Section 02: Farmer & Land Profile (`/farmers`)

**Purpose**: Baseline demographic analysis, educational impact on yields, irrigation methodology comparison, and searchable raw records for farmer identity and land plots.

### 📊 KPI Cards Row (6 Cards)
| KPI Card | Metric / Field | Unit / Subtext | Visual Styling |
| :--- | :--- | :--- | :--- |
| **Total Farmers** | Overall count | Count | Dark Green |
| **Top Village** | Village with highest farmer participation | Name | Amber |
| **Most Common Education** | Dominant education level | Category | Sky Blue |
| **Total Acreage** | Aggregate cultivated area | Acres (`ac`) | Amber |
| **Average Plot Size** | Mean plot size per farmer | Acres (`ac`) | Sky Blue |
| **Average Yield** | Baseline yield metric | `t/ha` | Mint Green |

### 📈 Charts & Bento Layout
1. **Farmers by Village (Top 10)**:
   - **Type**: Horizontal Bar Chart (`BarChart`).
   - **Data**: Top 10 villages ranked by number of farmers.
2. **Education vs. Average Yield**:
   - **Type**: Dual-Axis Composed Chart (`Bar` + `Line`).
   - **Left Y-Axis (Bar)**: Farmer count per education tier (Illiterate, Primary, Secondary, Higher Secondary, Graduate).
   - **Right Y-Axis (Line)**: Average yield (`t/ha`) per education tier.
3. **Irrigation Method: Acreage vs. Yield**:
   - **Type**: Dual-Axis Composed Chart (`Bar` + `Line`).
   - **Left Y-Axis (Bar)**: Total Acreage by irrigation method (Borewell, Drip, Canal, Flood, Rainfed).
   - **Right Y-Axis (Line)**: Average yield (`t/ha`) by irrigation method.

### 📋 Data Tables (Interactive & Clickable Rows)
1. **Identity Records Table**:
   - **Columns**: Farmer Code, Name, Mobile Number, Collection Date, Field Staff Employee, Village, Block.
   - **Interactivity**: Live search bar, row pagination/scroll, click row to open full **Farmer Profile Modal**.
2. **Land Records Table**:
   - **Columns**: Name, Village, Size of Largest Plot (Acres), Land Area (Ha).
   - **Interactivity**: Live search bar, row click modal drill-down.

---

## 🌾 Section 03: Yield & Crop Management (`/yield`)

**Purpose**: Yield distribution metrics, total nitrogen applied (TNA) relationship, plot size scatter distribution, and ratoon cycle planning.

### 📊 KPI Cards Row (5 Cards)
| KPI Card | Metric / Field | Unit / Subtext | Visual Styling |
| :--- | :--- | :--- | :--- |
| **Average Yield** | Mean crop yield | `t/ha` | Mint Green |
| **Average TNA** | Mean Total Nitrogen Applied | `kg` | Sky Blue |
| **Maximum Yield** | Peak recorded yield | `t/ha` | Gold |
| **% Current Ratoon** | Percentage of current ratoon fields | `%` | Dark Green |
| **% Planning Next Ratoon** | Percentage of farmers opting for next ratoon | `%` | Sky Blue |

### 📈 Charts & Bento Layout
1. **Nitrogen Applied vs. Average Yield**:
   - **Type**: Dual-Axis Composed Chart (`Bar` + `Line`).
   - **X-Axis**: Nitrogen application ranges (bins in `kg`).
   - **Left Y-Axis (Bar)**: Farmer count.
   - **Right Y-Axis (Line)**: Average yield curve (`t/ha`).
2. **Plot Size vs. Yield**:
   - **Type**: Scatter Chart (`ScatterChart`).
   - **X-Axis**: Plot Size (`Acres`).
   - **Y-Axis**: Yield (`t/ha`).
3. **Plant Crop vs. Ratoon Types**:
   - **Type**: Bar Chart (`BarChart`).
   - **Categories**: Plant Crop, Ratoon 1, Ratoon 2, Ratoon 3+.

### 📋 Data Tables
1. **Yield & Nutrition Records Table**:
   - **Columns**: Name, Village, Plot Size (Acres), Yield (`t/ha`), TNA (`kg`).
2. **Ratoon Planning Records Table**:
   - **Columns**: Name, Village, Current Crop, Wish to go for next Ratoon? (`Yes` / `No`).

---

## 🧪 Section 04: Fertilizer & Nutrient Use (`/fertilizer`)

**Purpose**: Application method profiling, core fertilizer consumption (Urea, DAP, MOP), specialty long-tail fertilizers, and organic inputs.

### 📊 KPI Cards Row (7 Cards)
| KPI Card | Metric / Field | Unit / Subtext | Visual Styling |
| :--- | :--- | :--- | :--- |
| **Most Common Method** | Primary application technique (e.g. Basal) | Category | Sky Blue |
| **Average Nitrogen** | Mean N applied per hectare | `kg` | Coral |
| **Total Urea** | Cumulative Urea consumed | `kg` | Dark Green |
| **Most Used Long-tail** | Top specialty fertilizer | Name | Coral |
| **Farmers Using Long-tail** | Count of farmers adopting specialty fertilizers | Count | Slate |
| **Most Used Organic** | Top organic input (e.g. Vermicompost, FYM) | Name | Mint Green |
| **Total Organic Volume** | Cumulative organic volume applied | `kg` | Amber |

### 📈 Charts & Bento Layout
1. **Top Core Fertilizers (Total Kg)**:
   - **Type**: Horizontal Bar Chart (`BarChart`).
   - **Data**: Aggregated consumption of Urea, DAP, MOP, SSP, NPK (in total `kg`).
2. **Application Method Distribution**:
   - **Type**: Bar Chart (`BarChart`).
   - **Categories**: Basal Application, Split Application, Drip Fertigation, Top Dress.
3. **Specialty Fertilizer Usage (Farmers)**:
   - **Type**: Bar Chart (`BarChart`).
   - **Data**: Farmer count adopting specialty inputs: Single Super Phosphate (SSP), NPK 10-26-26, Ammonium Sulphate, NPK 17-17-17, Calcium Ammonium Nitrate (CAN).
4. **Organic Inputs Usage (Farmers)**:
   - **Type**: Bar Chart (`BarChart`).
   - **Data**: Farmer count utilizing Vermicompost, Farmyard Manure (FYM), Goat/Sheep Manure, Poultry Manure, Jeevamrut.

### 📋 Data Tables
1. **Fertilizer Method Records Table**: Name, Village, Application Method badge.
2. **Specialty Fertilizer Usage Records Table (Kg)**: Name, SSP, NPK 10-26-26, Amm. Sulphate, NPK 17-17-17, CAN breakdown.
3. **Organic Input Usage Records Table (Kg)**: Name, Vermicompost, Goat/Sheep Manure, Poultry Manure, Jeevamrut breakdown.

---

## 🌤️ Section 05: Climate & Advanced Analytics (`/climate`)

**Purpose**: Climate vulnerability, severe weather impact tracking, 4-quadrant nitrogen efficiency diagnostic matrix, village yield rankings, and critical inefficiency outlier detection.

### 📊 KPI Cards Row (3 Cards)
| KPI Card | Metric / Field | Unit / Subtext | Visual Styling |
| :--- | :--- | :--- | :--- |
| **% Normal Year** | Percentage reporting normal climate conditions | `%` | Sky Blue |
| **% Stressed Year** | Percentage reporting climate stress | `%` | Amber |
| **Top Stressor** | Primary climate disruption (e.g., Drought, Unseasonal Rain) | Category | Coral |

### 🧠 Intelligence Widgets & Leaderboards
1. **Severe Climate Events**:
   - **Type**: Bar Chart (`BarChart`).
   - **Data**: Reports of Drought, Excess Rainfall, Heatwaves, Pest Outbreaks.
2. **Nitrogen Efficiency Quadrant Analysis Matrix**:
   - **Segment 1 - Efficient Target**: High Yield ($\ge 115\text{ t/ha}$), Low Nitrogen ($< 380\text{ kg}$) -> *Green Badge & Farm Count*.
   - **Segment 2 - Excessive Nitrogen**: High Yield ($\ge 115\text{ t/ha}$), High Nitrogen ($\ge 380\text{ kg}$) -> *Amber Badge & Farm Count*.
   - **Segment 3 - Under-fertilized**: Low Yield ($< 115\text{ t/ha}$), Low Nitrogen ($< 380\text{ kg}$) -> *Slate Badge & Farm Count*.
   - **Segment 4 - Critical Outliers**: Low Yield ($< 115\text{ t/ha}$), High Nitrogen ($\ge 380\text{ kg}$) -> *Rose/Red Badge & Farm Count*.
   - **EDF Extension Recommendation Card**: Dynamic AI recommendation box highlighting target farms requiring field intervention.
3. **Village Yield Rankings Leaderboard**:
   - **Table**: Rank (#1..N), Village Name, Average Yield (`t/ha`), Efficiency Ratio ($\text{Yield} / \text{Nitrogen}$).
4. **High Productivity Farmers Leaderboard**:
   - Top 5 performing farmers listing Rank, Name, Survey ID, Village, Yield (`t/ha`), and Nitrogen (`kg`).
5. **Critical Nitrogen Inefficiency Outliers List**:
   - Top 5 highest risk farms (high nitrogen input, poor yield output). Clickable cards linking directly to their survey profile.
6. **Growth Stage Impacted**:
   - **Type**: Horizontal Bar Chart (`BarChart`).
   - **Categories**: Germination, Tillering, Grand Growth, Maturity.
7. **Climate Records Data Table**:
   - **Columns**: Name, Village, Severe Climatic Events, Growth Stage Impacted.

---

## 🔍 Interactive Features & Drill-Down Profile Modal

### 💬 Floating AI Intelligence Assistant (`AIAssistant`)
* **Trigger**: Persistent floating action button in bottom right corner.
* **Capabilities**: Answers queries on yield metrics, nitrogen risk factors, ratoon status, and extension recommendations.

### 👤 Individual Farmer Profile Modal (`FarmerProfile`)
Triggered by clicking any row in any data table or outlier leaderboard card. Contains detailed inspection sections:

1. **Header**:
   - Farmer Name, Survey ID, Kobo Unique ID, Farmer Code.
   - Verification Badge (*Acknowledged / Unacknowledged* with officer name).
2. **Identity & Admin Card**:
   - Farmer Name, Mobile Number, Village, Block/District, Crop Type, State.
   - Survey Date, Field Staff Employee Name, Designation.
3. **Land & Planning Card**:
   - Size of Largest Plot (Acres), Total Land Area (Hectares), Next Ratoon Intent (`Yes`/`No`).
4. **Yield & Nutrition Metrics Card**:
   - Exact Yield (`t/ha`), Total Nitrogen Applied (`kg`).
5. **Detailed Fertilizer & Organic Breakdowns**:
   - Itemized quantities for every synthetic fertilizer (Urea, DAP, MOP, SSP, NPKs) and organic inputs (Vermicompost, FYM, Manure, Jeevamrut).

---

## 📐 Data Architecture Reference

For developers and backend integration:
```typescript
// Core Data Schema Mapping
interface SurveyProfile {
  surveyId: number;
  koboUniqueId: string;
  farmerCode: string;
  name: string;
  mobileNumber: string;
  village: string;
  block: string;
  district: string;
  state: string;
  crop: string;
  collectionDate: string;
  employeeName: string;
  employeeDesignation: string;
  largestPlotAcres: number;
  landAreaHectare: number;
  wantsNextRatoon: boolean;
  yieldTonPerHa: number;
  totalNitrogenKg: number;
  fertilizerUsage: Record<string, number>;
  organicUsage: Record<string, number>;
  acknowledged: boolean;
  acknowledgedBy?: string;
}
```

---
*Generated for the EDF Sugarcane Dashboard Integration.*

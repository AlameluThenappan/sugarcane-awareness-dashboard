// Central place for the backend base URL. Change this if you deploy the API
// somewhere other than localhost later.
export const API_BASE_URL = "http://127.0.0.1:8000";

const STATIC = false;

async function apiGet<T>(path: string): Promise<T> {
  const url = STATIC
    ? `/data/${path.replace(/\/$/, "").split("/").pop()}.json`
    : `${API_BASE_URL}${path}`;
  const token = localStorage.getItem("edf_auth_token");
  const res = await fetch(url, {
    headers: STATIC || !token ? {} : { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed: ${url} (status ${res.status})`);
  return res.json();
}

export type SummaryStats = {
  totalFarmers: number;
  totalSurveys: number;
  totalAcres: number;
  avgYield: number;
  avgNitrogen: number;
  plantCropPct: number;
  ratoonPct: number;
  blockCount: number;
  villageCount: number;
  acknowledgedCount: number;
  pendingAcknowledgementCount: number;
  normalYearPct: number;
  stressedYearPct: number;
};

export type NitrogenYieldPoint = {
  n: number;
  yield: number;
  name: string;
};

export type SurveyProfile = {
  surveyId: number;
  koboUniqueId: string | null;
  farmerCode: string;
  name: string;
  mobileNumber: string | null;
  state: string | null;
  district: string | null;
  block: string | null;
  village: string | null;
  crop: string | null;
  collectionDate: string | null;
  employeeName: string | null;
  employeeDesignation: string | null;
  largestPlotAcres: number | null;
  landAreaHectare: number | null;
  wantsNextRatoon: boolean | null;
  yieldTonnesPerHa: number | null;
  totalNutrientApplied: number | null;
  fertilizerMethod: string | null;
  severeClimaticEvents: string;
  growthStageImpacted: string | null;
  fertilizerUsage: Record<string, number>;
  organicUsage: Record<string, number>;
  acknowledged: boolean;
  acknowledgedBy: string | null;
};

export function getSurveyProfile(surveyId: number) {
  if (STATIC) {
    return fetch(`/data/surveys/${surveyId}.json`).then((r) => {
      if (!r.ok) throw new Error(`Profile ${surveyId} not found`);
      return r.json() as Promise<SurveyProfile>;
    });
  }
  return apiGet<SurveyProfile>(`/api/surveys/${surveyId}/profile`);
}

export type AnalyticsRow = {
  surveyId: number;
  id: string;
  name: string;
  village: string;
  yield: number;
  n: number;
  acres: number;
};

export function getAnalyticsRaw() {
  return apiGet<AnalyticsRow[]>("/api/dashboard/analytics-raw");
}

export function getSummary() {
  return apiGet<SummaryStats>("/api/dashboard/summary");
}

export function getNitrogenYieldScatter() {
  return apiGet<NitrogenYieldPoint[]>("/api/dashboard/nitrogen-yield-scatter");
}

export type YieldPageData = {
  avgYield: number;
  avgN: number;
  maxYield: number;
  comboData: { name: string; Farmers: number; AvgYield: number }[];
  scatterData: { acres: number; yield: number; name: string }[];
  records: { surveyId: number; name: string; village: string; acres: number; yield: number; tna: number }[];
};

export function getYieldPageData() {
  return apiGet<YieldPageData>("/api/dashboard/yield-page");
}

export type IdentityPageData = {
  totalFarmers: number;
  topVillage: string;
  topEdu: string;
  villageData: { name: string; value: number }[];
  ageData: { name: string; value: number }[];
  eduData: { name: string; Farmers: number; AvgYield: number }[];
  records: {
    surveyId: number;
    farmerCode: string;
    name: string;
    mobileNumber: string | null;
    collectionDate: string | null;
    employee: string | null;
    village: string;
    block: string;
  }[];
};

export function getIdentityPageData() {
  return apiGet<IdentityPageData>("/api/dashboard/identity-page");
}

export type LandPageData = {
  totalAcres: number;
  avgPlot: number;
  avgYield: number;
  yieldDistData: { name: string; value: number }[];
  yieldIrrData: { name: string; Farmers: number; TotalAcres: number; AvgYield: number }[];
  records: { surveyId: number; name: string; village: string; largestPlotAcres: number | null; landAreaHa: number | null }[];
};

export function getLandPageData() {
  return apiGet<LandPageData>("/api/dashboard/land-page");
}

export type FertilizerPageData = {
  fertData: { name: string; value: number }[];
  methData: { name: string; value: number }[];
  avgN: number;
  records: { surveyId: number; name: string; village: string; method: string }[];
};
export function getFertilizerPageData() {
  return apiGet<FertilizerPageData>("/api/dashboard/fertilizer-page");
}

export type RatoonPageData = {
  rtData: { name: string; value: number }[];
  nextData: { name: string; Farmers: number; AvgYield: number }[];
  pctRatoon: number;
  pctNext: number;
  records: { surveyId: number; name: string; village: string; crop: string; wishNextRatoon: string }[];
};
export function getRatoonPageData() {
  return apiGet<RatoonPageData>("/api/dashboard/ratoon-page");
}

export type ClimatePageData = {
  evData: { name: string; value: number }[];
  stData: { name: string; value: number }[];
  pctNormal: number;
  topStress: string;
  records: { surveyId: number; name: string; village: string; severeEvents: string; growthStage: string }[];
};
export function getClimatePageData() {
  return apiGet<ClimatePageData>("/api/dashboard/climate-page");
}

export type LongTailFertPageData = {
  chartData: { name: string; value: number }[];
  top: string;
  usingAny: number;
  records: Record<string, any>[];
};
export function getLongTailFertPageData() {
  return apiGet<LongTailFertPageData>("/api/dashboard/longtail-fertilizer-page");
}

export type LongTailOrgPageData = {
  chartData: { name: string; value: number }[];
  top: string;
  vol: number;
  records: { surveyId: number; name: string; vermicompost: number | null; goatSheepManure: number | null; poultryManure: number | null; jeevamrut: number | null }[];
};
export function getLongTailOrgPageData() {
  return apiGet<LongTailOrgPageData>("/api/dashboard/longtail-organic-page");
}

export type FarmerLocation = {
  surveyId: number;
  farmerCode: string;
  name: string;
  village: string;
  block: string;
  lat: number;
  lng: number;
  yield: number;
  acres: number;
};

export function getFarmerLocations() {
  return apiGet<FarmerLocation[]>("/api/dashboard/farmer-locations");
}

export function getVillageData() {
  return apiGet<any[]>("/api/dashboard/villages");
}

export function getIdentityStats() {
  return apiGet<any>("/api/dashboard/identity");
}

export function getFertilizerStats() {
  return apiGet<any[]>("/api/dashboard/fertilizer");
}

export function getClimateStats() {
  return apiGet<any[]>("/api/dashboard/climate");
}

export function getFarmers() {
  return apiGet<any[]>("/api/farmers/");
}

export function getSurveys(params?: { year?: number; village?: string; block?: string; acknowledged?: boolean }) {
  const qs = params
    ? "?" + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  return apiGet<any[]>(`/api/surveys/${qs}`);
}

export async function acknowledgeSurvey(surveyId: number, acknowledgedBy: string) {
  const res = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/acknowledge`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
  });
  if (!res.ok) throw new Error(`Failed to acknowledge survey ${surveyId}`);
  return res.json();
}

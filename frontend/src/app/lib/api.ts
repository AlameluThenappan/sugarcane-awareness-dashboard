import { supabase } from "../lib/supabaseClient";

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
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

export type AnalyticsRow = {
  surveyId: number;
  id: string;
  name: string;
  village: string;
  yield: number;
  n: number;
  acres: number;
};

export type YieldPageData = {
  avgYield: number;
  avgN: number;
  maxYield: number;
  comboData: { name: string; Farmers: number; AvgYield: number }[];
  scatterData: { acres: number; yield: number; name: string }[];
  records: { surveyId: number; name: string; village: string; acres: number; yield: number; tna: number }[];
};

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

export type LandPageData = {
  totalAcres: number;
  avgPlot: number;
  avgYield: number;
  yieldDistData: { name: string; value: number }[];
  yieldIrrData: { name: string; Farmers: number; TotalAcres: number; AvgYield: number }[];
  records: { surveyId: number; name: string; village: string; largestPlotAcres: number | null; landAreaHa: number | null }[];
};

export type FertilizerPageData = {
  fertData: { name: string; value: number }[];
  methData: { name: string; value: number }[];
  avgN: number;
  records: { surveyId: number; name: string; village: string; method: string }[];
};

export type RatoonPageData = {
  rtData: { name: string; value: number }[];
  nextData: { name: string; Farmers: number; AvgYield: number }[];
  pctRatoon: number;
  pctNext: number;
  records: { surveyId: number; name: string; village: string; crop: string; wishNextRatoon: string }[];
};

export type ClimatePageData = {
  evData: { name: string; value: number }[];
  stData: { name: string; value: number }[];
  pctNormal: number;
  topStress: string;
  records: { surveyId: number; name: string; village: string; severeEvents: string; growthStage: string }[];
};

export type LongTailFertPageData = {
  chartData: { name: string; value: number }[];
  top: string;
  usingAny: number;
  records: Record<string, any>[];
};

export type LongTailOrgPageData = {
  chartData: { name: string; value: number }[];
  top: string;
  vol: number;
  records: { surveyId: number; name: string; vermicompost: number | null; goatSheepManure: number | null; poultryManure: number | null; jeevamrut: number | null }[];
};

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

export const getSummary = () => rpc<SummaryStats>("summary");
export const getAnalyticsRaw = () => rpc<AnalyticsRow[]>("analytics_raw");
export const getIdentityPageData = () => rpc<IdentityPageData>("identity_page");
export const getLandPageData = () => rpc<LandPageData>("land_page");
export const getYieldPageData = () => rpc<YieldPageData>("yield_page");
export const getRatoonPageData = () => rpc<RatoonPageData>("ratoon_page");
export const getFertilizerPageData = () => rpc<FertilizerPageData>("fertilizer_page");
export const getClimatePageData = () => rpc<ClimatePageData>("climate_page");
export const getLongTailFertPageData = () => rpc<LongTailFertPageData>("longtail_fertilizer_page");
export const getLongTailOrgPageData = () => rpc<LongTailOrgPageData>("longtail_organic_page");
export const getVillageData = () => rpc<any[]>("villages");
export const getFarmerLocations = () => rpc<FarmerLocation[]>("farmer_locations");

export const getSurveyProfile = (surveyId: number) =>
  rpc<SurveyProfile>("survey_profile", { p_survey_id: surveyId });

export const getSurveys = (params?: { year?: number; village?: string; block?: string }) =>
  rpc<any[]>("list_surveys", {
    p_year: params?.year ?? null,
    p_village: params?.village ?? null,
    p_block: params?.block ?? null,
  });
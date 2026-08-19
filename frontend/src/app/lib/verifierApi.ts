import { supabase } from "./supabaseClient";
import { SummaryStats, BlockRow, VillageRow, BatchRow } from "./verifierTypes";

async function rpc<T>(fn: string): Promise<T> {
  const { data, error } = await supabase.rpc(fn);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export const getVerifierSummary = () => rpc<SummaryStats>("verifier_summary");
export const getApprovalByBlock = () => rpc<BlockRow[]>("verifier_approval_by_block");
export const getVillageCoverage = () => rpc<VillageRow[]>("verifier_village_coverage");
export const getUploadBatches = () => rpc<BatchRow[]>("verifier_upload_batches");
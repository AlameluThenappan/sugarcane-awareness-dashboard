// CONTRACT for the backend RPC functions. Each Postgres function must
// return JSON matching these shapes exactly — same field names, same
// casing. The frontend does not transform the response.

export type SummaryStats = {
  totalRecords: number;
  approved: number;
  notApproved: number;
  approvalRate: number;              // whole number, e.g. 92 (not 0.92)
  lastUpload: string | null;         // ISO date string, or null
  newThisUpload: number | null;
};
// backend function: verifier_summary()  → single SummaryStats object

export type BlockRow = {
  block: string;
  approved: number;
  notApproved: number;
};
// backend function: verifier_approval_by_block()  → BlockRow[]

export type VillageRow = {
  village: string;
  records: number;
  approvalRate: number;              // whole number, e.g. 91
};
// backend function: verifier_village_coverage()  → VillageRow[]

export type BatchRow = {
  id: number;
  uploadedAt: string;                // ISO timestamp
  filename: string;
  rowCount: number;
  approved: number | null;
  notApproved: number | null;
  newRecords: number | null;
  updatedRecords: number | null;
  status: "complete" | "failed";
};
// backend function: verifier_upload_batches()  → BatchRow[], newest first
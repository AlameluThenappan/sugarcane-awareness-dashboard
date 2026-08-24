import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { VerifierHeader } from "./VerifierHeader";
import { KPIRow } from "./KPIRow";
import { ApprovalByBlock } from "./ApprovalByBlock";
import { VillageCoverage } from "./VillageCoverage";
import { UploadHistoryTable } from "./UploadHistory";
import { EmptyState } from "./EmptyState";
import { UploadDropzone } from "./UploadDropZone";
import { UploadResultDialog, UploadResult } from "./UploadResultDialog";
import { UploadErrorDialog, UploadError } from "./UploadErrorDialog";
import {
  getVerifierSummary, getApprovalByBlock, getVillageCoverage, getUploadBatches,
} from "../lib/verifierApi";
import { SummaryStats, BlockRow, VillageRow, BatchRow } from "../lib/verifierTypes";

// Shape returned by the upload-verifier-export Edge Function on success.
type UploadSummary = {
  totalRowsInFile: number;
  approvedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  newRowsInserted: number;
};

// FunctionsHttpError only carries the raw Response in `context` — the
// actual `{ error: "..." }` body has to be read off it separately.
async function describeUploadError(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json();
      if (body?.error) return body.error as string;
    } catch {
      // fall through to the generic message below
    }
  }
  return err instanceof Error ? err.message : "Upload failed.";
}

export function VerifierApp({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[] | null>(null);
  const [villages, setVillages] = useState<VillageRow[] | null>(null);
  const [batches, setBatches] = useState<BatchRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dropzoneOpen, setDropzoneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<UploadError | null>(null);

const load = () => {
  setLoadError(null);
  Promise.all([
    getVerifierSummary().catch(() => ({
      totalRecords: 0, approved: 0, notApproved: 0,
      approvalRate: 0, lastUpload: null, newThisUpload: null,
    })),
    getApprovalByBlock().catch(() => []),
    getVillageCoverage().catch(() => []),
    getUploadBatches().catch(() => []),
  ]).then(([s, b, v, u]) => {
    setSummary(s); setBlocks(b); setVillages(v); setBatches(u);
  });
};

  useEffect(load, []);

  const hasData = batches !== null && batches.length > 0;

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data, error: fnError } = await supabase.functions.invoke<UploadSummary>(
        "upload-verifier-export",
        { body: formData },
      );
      if (fnError) throw fnError;
      if (!data) throw new Error("No response from server.");

      setDropzoneOpen(false);
      setResult({
        filename: file.name,
        rowCount: data.totalRowsInFile,
        approved: data.approvedRows,
        notApproved: data.rejectedRows,
        newRecords: data.newRowsInserted,
      });
    } catch (err) {
      setDropzoneOpen(false);
      setError({ filename: file.name, errors: [await describeUploadError(err)] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <VerifierHeader onUpload={() => setDropzoneOpen(true)} />

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-4">
        {loadError && (
          <div className="rounded-xl p-4 text-[13px]" style={{ background: "rgba(186,98,84,0.08)", color: "var(--clay)" }}>
            Could not load data: {loadError}
          </div>
        )}

        {!loadError && batches !== null && !hasData ? (
          <EmptyState onUpload={() => setDropzoneOpen(true)} />
        ) : (
          <>
            <KPIRow data={summary} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <ApprovalByBlock data={blocks} />
              <VillageCoverage data={villages} />
            </div>
            <UploadHistoryTable data={batches} />
          </>
        )}
      </main>

      <UploadDropzone
        open={dropzoneOpen}
        busy={busy}
        onClose={() => setDropzoneOpen(false)}
        onFile={handleFile}
      />
      <UploadResultDialog result={result} onClose={() => { setResult(null); load(); }} />
      <UploadErrorDialog error={error} onClose={() => setError(null)} />
    </div>
  );
}
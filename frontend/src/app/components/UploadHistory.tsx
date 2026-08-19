import { BatchRow } from "../lib/verifierTypes";
import { nf } from "../../app/pages/PageKit";

const dash = (v: number | null) => (v === null ? "—" : nf.format(v));

export function UploadHistoryTable({ data }: { data: BatchRow[] | null }) {
  if (!data) return <div className="glass-card-master p-5 h-[200px]" />;

  return (
    <div className="glass-card-master p-5">
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        Upload History
      </h3>
      <p className="text-[12px] mb-3" style={{ color: "var(--ink)", opacity: 0.55 }}>
        {data.length} batches received
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: "var(--ink)", opacity: 0.5 }}>
              <th className="text-left font-normal pb-2">Uploaded</th>
              <th className="text-left font-normal pb-2">File</th>
              <th className="text-right font-normal pb-2">Rows</th>
              <th className="text-right font-normal pb-2">Approved</th>
              <th className="text-right font-normal pb-2">Not appr.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                <td className="py-2.5" style={{ color: "var(--ink)", opacity: 0.8 }}>
                  {new Date(b.uploadedAt).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
                <td className="truncate max-w-[180px]" style={{ color: "var(--ink)", opacity: 0.55 }}>
                  {b.filename}
                </td>
                <td className="text-right table-cell-numeric" style={{ color: "var(--ink)" }}>{nf.format(b.rowCount)}</td>
                <td className="text-right table-cell-numeric" style={{ color: "var(--ink)" }}>{dash(b.approved)}</td>
                <td className="text-right table-cell-numeric" style={{ color: "var(--ink)" }}>{dash(b.notApproved)}</td>
                <td className="text-right">
                  
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
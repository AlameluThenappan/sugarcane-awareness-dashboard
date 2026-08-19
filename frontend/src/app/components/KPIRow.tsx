// src/verifier/components/KPIRow.tsx
import { KPITile } from "../../app/pages/PageKit";
import { SummaryStats } from "../lib/verifierTypes";

export function KPIRow({ data }: { data: SummaryStats | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card-master p-4 h-[86px]" />
        ))}
      </div>
    );
  }

  const lastUpload = data.lastUpload
    ? new Date(data.lastUpload).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPITile value={data.totalRecords} label="Total Records" delay={0} />
      <KPITile value={data.approved} label="Approved" delay={0.04} />
      <KPITile value={data.notApproved} label="Not Approved" delay={0.08} />
      <KPITile value={`${data.approvalRate}%`} label="Approval Rate" delay={0.12} />
      <KPITile value={lastUpload} label="Last Upload" delay={0.16} />
      <KPITile
        value={data.newThisUpload === null ? "—" : `+${data.newThisUpload}`}
        label="New This Upload"
        delay={0.2}
      />
    </div>
  );
}
import { useEffect, useState } from "react";
import { getSurveyProfile, getRawSurveyProfile, SurveyProfile } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function ProfileCard({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={`glass-card-master rounded-2xl overflow-hidden relative ${className}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="font-semibold text-foreground font-outfit text-sm tracking-wide">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function FarmerProfile({ surveyId, onClose }: { surveyId: number; onClose: () => void }) {
  const { user } = useAuth();
  const canViewMobile = user?.role === "ADMIN";
  const [p, setP] = useState<SurveyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any> | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSurveyProfile(surveyId)
      .then((d) => {
        if (!cancelled) setP(d);
      })
      .catch((err) => {
        if (!cancelled) setError("Could not load this farmer's profile. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const loadRawData = async () => {
    setShowRawData(!showRawData);
    if (!showRawData && !rawData) {
      setRawLoading(true);
      try {
        const data = await getRawSurveyProfile(surveyId);
        setRawData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setRawLoading(false);
      }
    }
  };

  const fertEntries = p?.fertilizerUsage ? Object.entries(p.fertilizerUsage).filter(([, v]) => Number(v) > 0) : [];
  const orgEntries = p?.organicUsage ? Object.entries(p.organicUsage).filter(([, v]) => Number(v) > 0) : [];

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 bg-black/50 backdrop-blur-sm flex items-center justify-center font-sans"
      onClick={onClose}
    >
      <div 
        className={`bg-background border border-border shadow-2xl rounded-3xl w-full transition-all duration-300 max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 ${showRawData ? 'max-w-[1400px]' : 'max-w-4xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="text-sm leading-none" aria-hidden="true">←</span> Back to Dashboard
            </button>
            <button
               onClick={loadRawData}
               className="flex items-center gap-2 text-primary-foreground hover:bg-primary-surface border border-hairline px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
               {showRawData ? "Hide Full Raw Data" : "View Full Raw Data"}
            </button>
          </div>
          {p?.acknowledged && (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold leading-none" aria-hidden="true">✓</span>
              <span>Acknowledged{p.acknowledgedBy ? ` by ${p.acknowledgedBy}` : ""}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6 w-full lg:w-auto">

        {loading && (
          <div className="py-12 text-center text-muted-foreground text-sm font-medium">
            Loading farmer survey profile...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-rose-600 dark:text-rose-400 text-sm font-medium bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
            {error}
          </div>
        )}

        {p && (
          <>
            <div>
              <h1 className="text-3xl font-bold font-outfit text-foreground tracking-tight">
                {p.name || `Farmer #${p.farmerCode}`}
              </h1>
              <p className="text-muted-foreground text-xs mt-1 font-mono">
                Survey ID: <span className="text-foreground font-semibold">{p.surveyId}</span> • Kobo ID: <span className="text-foreground font-semibold">{p.koboUniqueId || "-"}</span> • Code: <span className="text-foreground font-semibold">{p.farmerCode}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity & Admin */}
              <ProfileCard title="Identity & Admin">
                <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Farmer Name</dt>
                    <dd className="font-semibold text-foreground text-sm">{p.name || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Mobile Number</dt>
                    <dd className="font-medium text-foreground">
                      {canViewMobile
                        ? p.mobileNumber || 'N/A'
                        : p.mobileNumber
                          ? `••••••${p.mobileNumber.replace(/\D/g, "").slice(-4)}`
                          : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Village</dt>
                    <dd className="font-medium text-foreground">{p.village || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Block / District</dt>
                    <dd className="font-medium text-foreground">{p.block || '-'}, {p.district || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Crop Type</dt>
                    <dd className="font-medium text-foreground">{p.crop || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">State</dt>
                    <dd className="font-medium text-foreground">{p.state || '-'}</dd>
                  </div>
                  <div className="col-span-2 pt-3 border-t border-border mt-1 grid grid-cols-3 gap-3">
                    <div>
                      <dt className="text-muted-foreground text-[10px] uppercase font-semibold">Survey Date</dt>
                      <dd className="text-foreground font-medium text-xs mt-0.5">{p.collectionDate || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-[10px] uppercase font-semibold">Field Staff</dt>
                      <dd className="text-foreground font-medium text-xs mt-0.5">{p.employeeName || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-[10px] uppercase font-semibold">Designation</dt>
                      <dd className="text-foreground font-medium text-xs mt-0.5">{p.employeeDesignation || 'N/A'}</dd>
                    </div>
                  </div>
                </dl>
              </ProfileCard>

              <div className="space-y-6">
                {/* Land & Planning */}
                <ProfileCard title="Land & Planning">
                  <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <dt className="text-muted-foreground mb-0.5">Largest Plot Size</dt>
                      <dd className="font-bold text-foreground text-base">{p.largestPlotAcres ?? '-'} <span className="text-xs text-muted-foreground font-normal">Acres</span></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-0.5">Total Land Area</dt>
                      <dd className="font-bold text-foreground text-base">{p.landAreaHectare ?? '-'} <span className="text-xs text-muted-foreground font-normal">Ha</span></dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground mb-0.5">Wish to go for Next Ratoon?</dt>
                      <dd className="font-semibold text-foreground">{p.wantsNextRatoon === null ? 'N/A' : (p.wantsNextRatoon ? 'Yes' : 'No')}</dd>
                    </div>
                  </dl>
                </ProfileCard>

                {/* Yield & Nutrition */}
                <ProfileCard title="Yield & Nutrition">
                  <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <dt className="text-[#2D6A4F] dark:text-[#4ADE9C] mb-1 font-semibold">Crop Yield</dt>
                      <dd className="font-bold text-foreground text-xl">{p.yieldTonnesPerHa ?? '0'} <span className="text-xs text-muted-foreground font-normal">t/ha</span></dd>
                    </div>
                    <div>
                      <dt className="text-[#3B82B8] dark:text-[#6FB3E0] mb-1 font-semibold">Total Nitrogen</dt>
                      <dd className="font-bold text-foreground text-xl">{p.totalNutrientApplied ?? '0'} <span className="text-xs text-muted-foreground font-normal">kg</span></dd>
                    </div>
                  </dl>
                </ProfileCard>

                {/* Climate Detail */}
                <ProfileCard title="Climate Detail">
                  <dl className="text-xs space-y-3">
                    <div>
                      <dt className="text-muted-foreground mb-1">Severe Climatic Events Reported</dt>
                      <dd className="text-foreground bg-muted/60 px-3 py-1.5 rounded-lg font-medium">{p.severeClimaticEvents || 'None'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">Growth Stage Impacted</dt>
                      <dd className="text-foreground bg-muted/60 px-3 py-1.5 rounded-lg font-medium">{p.growthStageImpacted || 'N/A'}</dd>
                    </div>
                  </dl>
                </ProfileCard>
              </div>
            </div>

            {/* Input Applications */}
            <ProfileCard title="Fertilizer & Organic Applications">
              <div className="mb-5 pb-4 border-b border-border">
                <h4 className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1.5">Fertilizer Application Method</h4>
                <p className="text-foreground text-xs font-semibold">{p.fertilizerMethod || 'N/A'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[#D4624A] dark:text-[#E8896F] text-[10.5px] font-bold uppercase tracking-wider mb-3">
                    Chemical Fertilizer Usage (Kg)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {fertEntries.map(([label, val]) => (
                      <div key={label} className="bg-muted/50 rounded-lg px-3 py-2 flex justify-between items-center border border-border">
                        <span className="text-muted-foreground">{label}</span>
                        <strong className="text-foreground">{val} kg</strong>
                      </div>
                    ))}
                    {fertEntries.length === 0 && <div className="text-muted-foreground italic col-span-2 text-xs">No specialty fertilizers recorded.</div>}
                  </div>
                </div>

                <div>
                  <h4 className="text-[#2D6A4F] dark:text-[#4ADE9C] text-[10.5px] font-bold uppercase tracking-wider mb-3">
                    Organic Usage (Kg)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {orgEntries.map(([label, val]) => (
                      <div key={label} className="bg-emerald-50/60 dark:bg-emerald-950/25 rounded-lg px-3 py-2 flex justify-between items-center border border-emerald-200 dark:border-emerald-900/40">
                        <span className="text-emerald-900/70 dark:text-emerald-300/80 font-medium">{label}</span>
                        <strong className="text-emerald-800 dark:text-emerald-300">{val} kg</strong>
                      </div>
                    ))}
                    {orgEntries.length === 0 && <div className="text-muted-foreground italic col-span-2 text-xs">No organic inputs recorded.</div>}
                  </div>
                </div>
              </div>
            </ProfileCard>
          </>
        )}
          </div>
          
          {/* Raw Data Sidebar */}
          {showRawData && (
            <div className="w-full lg:w-[450px] shrink-0 border border-border rounded-2xl bg-muted/20 overflow-hidden flex flex-col max-h-[75vh]">
               <div className="px-5 py-3.5 border-b border-border bg-muted/40">
                 <h3 className="font-semibold text-foreground font-outfit text-sm tracking-wide">Raw Survey Data</h3>
                 <p className="text-[11px] text-muted-foreground mt-0.5">All original columns from the uploaded dataset</p>
               </div>
               <div className="overflow-y-auto flex-1 p-0">
                 {rawLoading ? (
                   <div className="p-8 text-center text-muted-foreground text-sm font-medium">Loading raw data...</div>
                 ) : rawData ? (
                   <table className="w-full text-left border-collapse text-xs">
                     <tbody>
                       {Object.entries(rawData).map(([key, val], idx) => (
                         <tr key={key} className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/40"}>
                           <td className="px-4 py-2.5 border-b border-hairline font-mono text-[10px] text-muted-foreground w-1/2 break-words">
                             {key}
                           </td>
                           <td className="px-4 py-2.5 border-b border-hairline font-medium text-foreground w-1/2 break-words">
                             {val === null ? <span className="opacity-40 italic">null</span> : String(val)}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 ) : (
                   <div className="p-8 text-center text-rose-500 text-sm font-medium">Could not load raw data.</div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

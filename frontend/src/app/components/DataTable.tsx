import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Search, ChevronRight, ChevronUp, ChevronDown, ChevronLeft, Download } from "lucide-react";

// Turns a rendered cell (plain string/number, or JSX like chips/badges) into
// the same plain text the user sees on screen, so export matches the UI
// instead of relying on sortKey (which many columns don't define at all).
function cellToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  const html = renderToStaticMarkup(<>{node}</>).replace(/></g, "> <");
  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || "").replace(/\s+/g, " ").trim();
}

export type ColumnDef<T> = {
  header: string;
  accessor: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  sortKey?: (row: T) => string | number;
};

type DataTableProps<T> = {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  searchFields?: (row: T) => string;
  pageSize?: number;
};

export function DataTable<T>({
  title,
  subtitle,
  data,
  columns,
  onRowClick,
  searchFields,
  pageSize = 8,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol]       = useState<number | null>(null);
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [focused, setFocused]       = useState(false);
  const [page, setPage]             = useState(1);
  const [showAll, setShowAll]       = useState(false);
  const reduceMotion = useReducedMotion();

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm && searchFields) {
      const s = searchTerm.toLowerCase();
      result = result.filter((row) => searchFields(row).toLowerCase().includes(s));
    }
    if (sortCol !== null && columns[sortCol]?.sortKey) {
      const key = columns[sortCol].sortKey!;
      result.sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, searchTerm, searchFields, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, showAll]);

  const handleSort = (idx: number) => {
    if (!columns[idx].sortKey) return;
    if (sortCol === idx) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(idx); setSortDir("asc"); }
  };

  const handleExport = () => {
    if (!filteredData.length) return;
    const keys = columns.map((c) => c.header);
    const csvRows = [keys.join(",")];
    filteredData.forEach((row) => {
      const values = columns.map((c) => {
        const raw = cellToText(c.accessor(row));
        return `"${raw.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="glass-card-master overflow-hidden flex flex-col"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.26, ease: "easeOut" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 pt-5 pb-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>{title}</h2>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "var(--ink)", opacity: 0.55 }}>{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Search input, scoped to this table */}
          {searchFields && (
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] w-full sm:w-56 transition-colors duration-200"
              style={{ background: "var(--secondary)" }}
              animate={{
                borderColor: focused ? "var(--gold)" : "var(--hairline)",
                boxShadow: focused ? "0 0 0 3px rgba(168,147,102,0.14)" : "none",
              }}
              transition={{ duration: 0.15 }}
            >
              <Search size={13} style={{ color: focused ? "var(--gold)" : "var(--ink)", opacity: focused ? 1 : 0.4 }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="bg-transparent border-none outline-none text-[12.5px] w-full"
                style={{ color: "var(--ink)" }}
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    className="text-xs transition-colors"
                    style={{ color: "var(--ink)", opacity: 0.5 }}
                    onClick={() => { setSearchTerm(""); setPage(1); }}
                    aria-label="Clear search"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                  >
                    ✕
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <button
            onClick={handleExport}
            title="Export CSV"
            aria-label="Export CSV"
            className="btn-export flex items-center gap-1.5 px-3 py-2 text-[12px] cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto min-h-0 relative">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="table-header-cell px-5 py-2.5 cursor-pointer transition-colors group select-none"
                  onClick={() => handleSort(idx)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}>
                    {col.header}
                    {col.sortKey && (
                      <span
                        className="flex flex-col transition-opacity"
                        style={{ opacity: sortCol === idx ? 1 : 0 }}
                      >
                        {sortDir === "asc"
                          ? <ChevronUp size={11} style={{ color: "var(--gold)" }} />
                          : <ChevronDown size={11} style={{ color: "var(--gold)" }} />
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {onRowClick && <th className="px-5 py-2.5 w-8" />}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                className={`group data-row-hover h-10 ${onRowClick ? "cursor-pointer" : ""}`}
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={`px-5 text-[12.5px] ${col.align === "right" ? "table-cell-numeric" : col.align === "center" ? "text-center" : "text-left"}`}
                    style={{ color: "var(--ink)" }}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-4 text-right">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--gold)" }}
                    >
                      View <ChevronRight size={12} />
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-xs" style={{ color: "var(--ink)", opacity: 0.4 }}>
            No records match your search.
          </div>
        )}
      </div>

      {/* ── Footer / Pagination ── */}
      <div
        className="px-5 py-3 shrink-0 flex items-center justify-between text-[11.5px]"
        style={{ borderTop: "1px solid var(--hairline)", color: "var(--ink)" }}
      >
        <div className="flex items-center gap-3" style={{ opacity: 0.6 }}>
          <span>
            Showing {paginatedData.length} of {filteredData.length} records
          </span>
          {filteredData.length > pageSize && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="font-semibold cursor-pointer text-[11px] hover:underline"
              style={{ color: "var(--gold)", opacity: 1 }}
            >
              {showAll ? "Paginate" : "View All"}
            </button>
          )}
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-[8px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              style={{ border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <ChevronLeft size={13} />
            </button>
            <span
              className="px-3 py-1 rounded-[8px] text-[11px] font-semibold min-w-[52px] text-center"
              style={{ border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)" }}
            >
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-[8px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              style={{ border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

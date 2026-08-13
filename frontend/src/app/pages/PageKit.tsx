import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Cell } from "recharts";

export const nf = new Intl.NumberFormat("en-IN");

export const CHART_COLORS = ["var(--olive)", "var(--gold-soft)", "var(--clay-soft)", "var(--sage)", "var(--steel)"];

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  kpis,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  kpis?: { value: string; label: string }[];
}) {
  return (
    <div className="mb-2">
      <p className="eyebrow mb-1">{eyebrow}</p>
      <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h1>
      <p className="text-[13px] mt-1 max-w-2xl" style={{ color: "var(--ink)", opacity: 0.6 }}>{subtitle}</p>
      {kpis && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 mt-4">
          {kpis.map((k) => (
            <div key={k.label}>
              <div className="kpi-number" style={{ fontSize: 22 }}>{k.value}</div>
              <p className="text-[11px]" style={{ color: "var(--ink)", opacity: 0.55 }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KPITile({
  value, unit, label, delay = 0, icon,
}: {
  value: string | number; unit?: string; label: string; delay?: number; icon?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-master p-5"
    >
      {icon && <div className="mb-3" style={{ color: "var(--gold)" }}>{icon}</div>}
      <div className="kpi-number">
        {value}
        {unit && <span className="kpi-number-unit">{unit}</span>}
      </div>
      <p className="text-[12px] mt-1.5" style={{ color: "var(--ink)", opacity: 0.55 }}>{label}</p>
    </motion.div>
  );
}

export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card-master p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "var(--ink)", opacity: 0.55 }}>{subtitle}</p>}
        </div>
        {legend}
      </div>
      {/* role="img" + aria-label give screen readers a text summary of the chart, since the
          underlying SVG (Recharts) has no accessible text content of its own. */}
      <div className="flex-1 min-h-0 mt-2" role="img" aria-label={`${title}${subtitle ? ": " + subtitle : ""} chart`}>
        {children}
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border p-3 rounded-lg shadow-lg text-xs" style={{ borderColor: "var(--hairline)" }}>
      {label && <p className="font-semibold mb-1.5" style={{ color: "var(--ink)" }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 justify-between">
          <span style={{ color: p.color || p.fill }}>{p.name}</span>
          <strong style={{ color: "var(--ink)" }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/**
 * Hover-only focus interaction for bar/scatter charts: hovering an element
 * fades every other element and slightly enlarges the hovered one. Nothing
 * ever stays highlighted after the cursor leaves — there is no click/select
 * state, only pointer-driven `hovered`.
 *
 * Usage: const bars = useChartHover(data.length);
 *   <Bar dataKey="value">{bars.cells}</Bar>
 */
export function useChartHover(length: number, scale = 1.03) {
  const [hovered, setHovered] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  // Hover state is tied to this render of the data — if the dataset changes
  // shape (reload, resort), drop any stale index rather than highlight the
  // wrong element.
  useEffect(() => {
    setHovered(null);
  }, [length]);

  const cellStyle = (index: number): React.CSSProperties => ({
    transition: reduceMotion ? undefined : "opacity 180ms ease-out, transform 180ms ease-out",
    opacity: hovered !== null && index !== hovered ? 0.35 : 1,
    transform: hovered === index ? `scale(${scale})` : undefined,
    transformBox: "fill-box",
    transformOrigin: "center",
  });

  const cells = Array.from({ length }, (_, i) => (
    <Cell
      key={i}
      style={cellStyle(i)}
      onMouseEnter={() => setHovered(i)}
      onMouseLeave={() => setHovered(null)}
    />
  ));

  return { hovered, setHovered, cells };
}

/**
 * Custom dot renderer for the `Line` in a combined bar+line chart, driven by
 * the same `useChartHover` state as the chart's bars — hovering a bar
 * enlarges and highlights its matching line point (and vice versa), while
 * every other point fades. The line path itself stays put; only the dots move.
 */
export function comboDot(
  chartHover: { hovered: number | null; setHovered: (index: number | null) => void },
  color = "var(--olive)",
  baseRadius = 3,
) {
  return (props: any) => {
    const { cx, cy, index } = props;
    const { hovered, setHovered } = chartHover;
    const isHovered = hovered === index;
    const isDimmed = hovered !== null && !isHovered;
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={isHovered ? baseRadius * 1.35 : baseRadius}
        fill={color}
        opacity={isDimmed ? 0.35 : 1}
        style={{ transition: "r 180ms ease-out, opacity 180ms ease-out", cursor: "pointer" }}
        onMouseEnter={() => setHovered(index)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  };
}

const RADIAN = Math.PI / 180;

// Mirrors recharts' own Pie angle math (assuming the default startAngle=0,
// endAngle=360, minAngle=0 used by every pie/donut in this app) so we can
// know each slice's mid-angle *before* render, without reaching into
// recharts' internal sector geometry.
function pieMidAngles(values: number[], paddingAngle: number): number[] {
  const nonZeroCount = values.filter((v) => v !== 0).length;
  const realTotalAngle = 360 - nonZeroCount * paddingAngle;
  const sum = values.reduce((a, b) => a + b, 0);
  const angles: number[] = [];
  let prevEnd = 0;
  values.forEach((val, i) => {
    const percent = sum > 0 ? val / sum : 0;
    const start = i === 0 ? 0 : prevEnd + paddingAngle * (val !== 0 ? 1 : 0);
    const end = start + percent * realTotalAngle;
    angles.push((start + end) / 2);
    prevEnd = end;
  });
  return angles;
}

/**
 * Hover-only "explode" interaction for pie/donut slices: hovering a slice
 * pops it outward a few px along its own mid-angle and fades every other
 * slice. Nothing stays popped after the cursor leaves.
 *
 * Usage: const pie = usePieHover(data.map((d) => d.value), data.map((d) => d.fill));
 *   <Pie data={data} dataKey="value">{pie.cells}</Pie>
 */
export function usePieHover(values: number[], colors: string[], paddingAngle = 2, popPx = 5) {
  const [hovered, setHovered] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setHovered(null);
  }, [values.length]);

  const angles = pieMidAngles(values, paddingAngle);

  const cells = colors.map((fill, i) => {
    const isHovered = hovered === i;
    const isDimmed = hovered !== null && !isHovered;
    const rad = -angles[i] * RADIAN;
    const tx = isHovered ? Math.cos(rad) * popPx : 0;
    const ty = isHovered ? Math.sin(rad) * popPx : 0;
    return (
      <Cell
        key={i}
        fill={fill}
        style={{
          transition: reduceMotion ? undefined : "transform 180ms ease-out, opacity 180ms ease-out",
          transform: `translate(${tx}px, ${ty}px)`,
          opacity: isDimmed ? 0.35 : 1,
        }}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  });

  return { hovered, cells };
}

export const axisTick = { fill: "var(--ink)", fontSize: 10, opacity: 0.45 };
export const axisTickSm = { fill: "var(--ink)", fontSize: 9, opacity: 0.45 };

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

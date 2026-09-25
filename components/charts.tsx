"use client";

/**
 * Tiny dependency-free SVG charts. Kept intentionally small and theme-aware so
 * the dashboard stays light and looks bespoke rather than library-generic.
 */

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Donut chart with a centered total. Renders nothing meaningful when empty. */
export function Donut({
  data,
  size = 168,
  thickness = 22,
  centerValue,
  centerLabel,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerValue?: React.ReactNode;
  centerLabel?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-ink-100"
          strokeWidth={thickness}
        />
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d, i) => {
              const len = (d.value / total) * c;
              const seg = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return seg;
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold tabular-nums text-ink-900">
          {centerValue ?? total}
        </div>
        {centerLabel && (
          <div className="text-[11px] uppercase tracking-wide text-ink-500">
            {centerLabel}
          </div>
        )}
      </div>
    </div>
  );
}

/** Horizontal bar rows: a label, a proportional bar, and a value. */
export function BarList({
  data,
  max,
  valueSuffix = "",
}: {
  data: Slice[];
  max?: number;
  valueSuffix?: string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-xs text-ink-600 sm:w-40 sm:text-sm">
            {d.label}
          </div>
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${(d.value / top) * 100}%`,
                backgroundColor: d.color,
              }}
            />
          </div>
          <div className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-ink-900">
            {d.value}
            {valueSuffix}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A single proportional stacked bar (e.g. grade mix). */
export function StackBar({ data }: { data: Slice[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-100">
      {data
        .filter((d) => d.value > 0)
        .map((d) => (
          <div
            key={d.label}
            title={`${d.label}: ${d.value}`}
            style={{
              width: `${(d.value / total) * 100}%`,
              backgroundColor: d.color,
            }}
          />
        ))}
    </div>
  );
}

/** Solid pie chart (wedges). Pair with LegendRow list for labels. */
export function Pie({
  data,
  size = 168,
}: {
  data: Slice[];
  size?: number;
}) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((a, d) => a + d.value, 0);
  const r = size / 2;
  const c = r;

  // A single slice (or none) can't form a wedge path cleanly — draw a circle.
  if (slices.length <= 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill={slices[0]?.color ?? "currentColor"} className={slices[0] ? "" : "text-ink-100"} />
      </svg>
    );
  }

  let angle = -Math.PI / 2; // start at 12 o'clock
  const wedge = (value: number) => {
    const a0 = angle;
    const a1 = angle + (value / total) * 2 * Math.PI;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = c + r * Math.cos(a0);
    const y0 = c + r * Math.sin(a0);
    const x1 = c + r * Math.cos(a1);
    const y1 = c + r * Math.sin(a1);
    return `M ${c} ${c} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((d, i) => (
        <path key={i} d={wedge(d.value)} fill={d.color} stroke="var(--bg)" strokeWidth={1.5}>
          <title>{`${d.label}: ${d.value}`}</title>
        </path>
      ))}
    </svg>
  );
}

/** Vertical bar (column) chart: value on top, label (truncated) below. */
export function ColumnChart({
  data,
  valueSuffix = "",
  height = 180,
}: {
  data: Slice[];
  valueSuffix?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div
            key={d.label}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={`${d.label}: ${d.value}${valueSuffix}`}
          >
            <span className="text-[11px] font-medium tabular-nums text-ink-700">
              {d.value}
              {valueSuffix}
            </span>
            <div
              className="w-full max-w-[40px] rounded-t transition-[height]"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: 4,
                backgroundColor: d.color,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 border-t border-ink-100 pt-1.5">
        {data.map((d) => (
          <div
            key={d.label}
            className="min-w-0 flex-1 truncate text-center text-[10px] leading-tight text-ink-500"
            title={d.label}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface Point {
  label: string;
  x: number;
  y: number;
  color?: string;
}

/** Scatter plot with simple axes. Each point is one item (e.g. a customer). */
export function Scatter({
  points,
  xLabel,
  yLabel,
  height = 220,
}: {
  points: Point[];
  xLabel: string;
  yLabel: string;
  height?: number;
}) {
  const w = 380;
  const h = height;
  const padL = 30;
  const padB = 26;
  const xMax = Math.max(1, ...points.map((p) => p.x));
  const yMax = Math.max(1, ...points.map((p) => p.y));
  const px = (x: number) => padL + (x / xMax) * (w - padL - 14);
  const py = (y: number) => h - padB - (y / yMax) * (h - padB - 12);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Scatter chart">
      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={padL} y1={py(yMax * t)} x2={w - 8} y2={py(yMax * t)} className="stroke-ink-100" strokeWidth={1} />
      ))}
      {/* axes */}
      <line x1={padL} y1={h - padB} x2={w - 8} y2={h - padB} className="stroke-ink-300" strokeWidth={1} />
      <line x1={padL} y1={8} x2={padL} y2={h - padB} className="stroke-ink-300" strokeWidth={1} />
      {/* points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={px(p.x)} cy={py(p.y)} r={6} fill={p.color ?? "#3b82f6"} fillOpacity={0.7} stroke={p.color ?? "#3b82f6"} strokeWidth={1.5}>
            <title>{`${p.label} — ${p.x} orders · ${Math.round(p.y).toLocaleString()} m`}</title>
          </circle>
          <text x={px(p.x) + 8} y={py(p.y) + 3} className="fill-ink-500 text-[9px]">
            {p.label.length > 14 ? p.label.slice(0, 13) + "…" : p.label}
          </text>
        </g>
      ))}
      {/* axis labels */}
      <text x={(w + padL) / 2} y={h - 6} textAnchor="middle" className="fill-ink-400 text-[10px]">{xLabel}</text>
      <text x={11} y={h / 2} transform={`rotate(-90 11 ${h / 2})`} textAnchor="middle" className="fill-ink-400 text-[10px]">{yLabel}</text>
    </svg>
  );
}

/** Small colored legend dot + label + value used beside charts. */
export function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-ink-600">{label}</span>
      </span>
      <span className="shrink-0 font-medium tabular-nums text-ink-900">
        {value}
      </span>
    </div>
  );
}

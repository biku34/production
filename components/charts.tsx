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

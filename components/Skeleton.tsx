/**
 * Lightweight, theme-aware skeletons shown by route `loading.tsx` files. They
 * paint instantly on navigation (before the server render / DB round-trip
 * resolves), so clicking a link feels immediate instead of frozen.
 */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-200/70 ${className}`} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card space-y-3 p-4">
      <SkeletonBar className="h-3 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar key={i} className={`h-5 ${i % 2 ? "w-2/3" : "w-1/2"}`} />
      ))}
    </div>
  );
}

/** Generic page skeleton: header + KPI tiles + two content panels. */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-56" />
        <SkeletonBar className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card space-y-2 p-4">
            <SkeletonBar className="h-3 w-2/3" />
            <SkeletonBar className="h-6 w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5">
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-44 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table/list skeleton for the list-heavy routes. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-7 w-48" />
          <SkeletonBar className="h-3.5 w-64 max-w-full" />
        </div>
        <SkeletonBar className="h-9 w-36" />
      </div>
      <div className="card divide-y divide-ink-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <SkeletonBar className="h-4 w-16" />
            <SkeletonBar className="h-4 flex-1" />
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

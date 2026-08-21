/** Building blocks for loading placeholders, used while a collection's first snapshot is pending. */

export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

/** Placeholder rows for a `<table>` body while data is loading. */
export function SkeletonTableRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 lg:px-6 py-3.5">
              <SkeletonBar className="h-4 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Placeholder matching the shape of components/ui/CardStat.tsx. */
export function SkeletonCardStat() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-7 w-16" />
        </div>
        <SkeletonBar className="h-12 w-12 rounded-xl shrink-0" />
      </div>
      <SkeletonBar className="mt-3 h-3 w-32" />
    </div>
  )
}

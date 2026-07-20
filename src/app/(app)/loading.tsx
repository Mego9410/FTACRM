/**
 * Generic route skeleton shown while any (app) page's server data loads.
 * Pairs with the global top progress bar: the bar gives instant click
 * feedback, this fills the content area so navigation never looks frozen.
 */
export default function AppLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Page header */}
      <div className="mb-6">
        <div className="h-3 w-24 rounded bg-surface-3" />
        <div className="mt-3 h-7 w-64 rounded bg-surface-3" />
        <div className="mt-2 h-3.5 w-80 max-w-full rounded bg-surface-3" />
      </div>

      {/* Toolbar row */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="h-9 w-40 rounded-md bg-surface-3" />
        <div className="h-9 w-44 rounded-md bg-surface-3" />
        <div className="h-9 w-28 rounded-md bg-surface-3" />
      </div>

      {/* Content card with rows */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <div className="h-3 w-32 rounded bg-surface-3" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0">
            <div className="h-8 w-8 shrink-0 rounded-full bg-surface-3" />
            <div className="h-3.5 flex-1 rounded bg-surface-3" style={{ maxWidth: `${70 - i * 4}%` }} />
            <div className="hidden h-3.5 w-24 rounded bg-surface-3 sm:block" />
            <div className="hidden h-3.5 w-16 rounded bg-surface-3 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

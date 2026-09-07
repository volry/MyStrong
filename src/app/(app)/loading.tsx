/** Instant skeleton while a tab's server data loads. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-8 w-40 rounded-lg bg-muted" />
      <div className="h-36 rounded-xl bg-muted" />
      <div className="h-14 rounded-xl bg-muted" />
      <div className="h-14 rounded-xl bg-muted" />
      <div className="h-14 rounded-xl bg-muted" />
    </div>
  );
}

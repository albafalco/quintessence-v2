export function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <section className="premium-card magia-surface relative overflow-hidden p-4 sm:p-6 md:p-10">
        <div className="space-y-4">
          <div className="h-6 w-40 rounded-lg bg-muted/50" />
          <div className="h-10 w-64 max-w-full rounded-lg bg-muted/40" />
          <div className="h-4 w-48 rounded-lg bg-muted/30" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/30" />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-5 h-7 w-40 rounded-lg bg-muted/40" />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="h-48 rounded-xl bg-muted/30" />
          <div className="h-48 rounded-xl bg-muted/30" />
        </div>
      </section>
    </div>
  );
}
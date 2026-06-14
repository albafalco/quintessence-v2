export default function LocaleLoading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-splash.png" alt="" width={64} height={64} className="opacity-80" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted/40">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/60" />
        </div>
      </div>
    </div>
  );
}
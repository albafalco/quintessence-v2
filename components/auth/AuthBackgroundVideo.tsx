'use client';

export function AuthBackgroundVideo() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block"
      aria-hidden
    >
      <video
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/auth/background-poster.jpg"
      >
        <source src="/auth/background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,8,18,0.45)_100%)]" />
    </div>
  );
}
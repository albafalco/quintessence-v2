'use client';

export function BootFallback() {
  return (
    <div
      id="boot-fallback"
      style={{
        display: 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        backgroundColor: '#0a0812',
        color: '#f5f0e6',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-splash.png" alt="" width={64} height={64} />
      <p style={{ color: '#a89bb8', fontSize: '0.95rem', maxWidth: '20rem' }}>
        Az alkalmazás nem indult el. Próbáld újra.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '0.75rem 1.5rem',
          border: 'none',
          borderRadius: '0.75rem',
          background: '#3b2a6e',
          color: '#f5f0e6',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Újratöltés
      </button>
    </div>
  );
}
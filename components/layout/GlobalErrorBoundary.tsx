'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[boot] React error boundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            background: '#0a0812',
            color: '#f5f0e6',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-splash.png" alt="" width={64} height={64} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Valami hiba történt</h1>
          <p style={{ color: '#a89bb8', fontSize: '0.9rem', maxWidth: '22rem' }}>
            {this.state.error.message || 'Ismeretlen hiba az alkalmazás betöltésekor.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
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

    return this.props.children;
  }
}
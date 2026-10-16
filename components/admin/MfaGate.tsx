'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MfaEnrollForm } from '@/components/admin/MfaEnrollForm';
import { CodeInput, PrimaryButton } from '@/components/admin/ui';

/** Shown instead of the admin pages until the session passes two-factor authentication. */
export function MfaGate({ mode }: { mode: 'enroll' | 'verify' }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg">
      <section className="premium-card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-gradient-gold">Kétlépcsős azonosítás</h1>
            <p className="text-xs text-muted-foreground">Az admin felülethez szükséges</p>
          </div>
        </div>
        {mode === 'enroll' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Az admin felület csak hitelesítő appal (pl. Google Authenticator) megerősített belépéssel érhető el. Ezt egyszer kell beállítani.
            </p>
            <MfaEnrollForm existingCount={0} onDone={() => router.refresh()} />
          </>
        ) : (
          <MfaVerifyForm onDone={() => router.refresh()} />
        )}
      </section>
    </div>
  );
}

function MfaVerifyForm({ onDone }: { onDone: () => void }) {
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        const list = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name || 'Hitelesítő app' }));
        setFactors(list);
        setFactorId(list[0]?.id ?? '');
      });
  }, []);

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setBusy(false);
      setCode('');
      setError('Hibás vagy lejárt kód. Várd meg a következő kódot, és próbáld újra.');
      return;
    }
    onDone();
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
    >
      <p className="text-sm text-muted-foreground">Írd be a hitelesítő appban látható 6 jegyű kódot.</p>
      {factors.length > 1 && (
        <select
          value={factorId}
          onChange={(e) => setFactorId(e.target.value)}
          aria-label="Eszköz"
          className="h-10 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm text-cream"
        >
          {factors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <CodeInput value={code} onChange={setCode} autoFocus />
        <PrimaryButton type="submit" disabled={busy || code.length !== 6 || !factorId}>
          {busy ? 'Ellenőrzés…' : 'Belépés'}
        </PrimaryButton>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

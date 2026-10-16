'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logMfaChange } from '@/app/[locale]/admin/actions';
import { CodeInput, PrimaryButton } from '@/components/admin/ui';

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  name: string;
}

/** Adds a TOTP device: QR code (or secret) for the authenticator app, then one code to confirm. */
export function MfaEnrollForm({ onDone, existingCount }: { onDone: () => void; existingCount: number }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // A previous, abandoned setup leaves an unverified factor behind; it would block a new one
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const name = `Quintessence admin ${existingCount + 1} (${new Date().toLocaleDateString('hu-HU')})`;
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: name, issuer: 'Quintessence' });
    setBusy(false);
    if (enrollError || !data) {
      console.error('[mfa] enroll failed:', enrollError?.message);
      setError('Nem sikerült elindítani a beállítást. Ellenőrizd, hogy a Supabase-ben engedélyezve van-e a TOTP.');
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, name });
  };

  const verify = async () => {
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    if (verifyError) {
      setBusy(false);
      setCode('');
      setError('Hibás vagy lejárt kód. Várd meg a következő kódot, és próbáld újra.');
      return;
    }
    await logMfaChange('enroll', enrollment.name);
    setBusy(false);
    onDone();
  };

  if (!enrollment) {
    return (
      <div className="space-y-3">
        <PrimaryButton onClick={start} disabled={busy}>
          {busy ? 'Előkészítés…' : 'Beállítás indítása'}
        </PrimaryButton>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Nyisd meg a hitelesítő appot, és adj hozzá új fiókot QR-kóddal.</li>
        <li>Olvasd be az alábbi kódot (vagy írd be kézzel a titkos kulcsot).</li>
        <li>Írd be az app által mutatott 6 jegyű kódot.</li>
      </ol>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URI from Supabase */}
        <img src={enrollment.qrCode} alt="QR-kód a hitelesítő apphoz" className="h-44 w-44 rounded-xl bg-white p-2" />
        <div className="min-w-0 space-y-1 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">Titkos kulcs kézi beíráshoz:</p>
          <code className="block break-all rounded-lg bg-muted/40 px-2 py-1.5 font-mono text-sm tracking-wider text-cream">
            {enrollment.secret.match(/.{1,4}/g)?.join(' ')}
          </code>
        </div>
      </div>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <CodeInput value={code} onChange={setCode} autoFocus />
        <PrimaryButton type="submit" disabled={busy || code.length !== 6}>
          {busy ? 'Ellenőrzés…' : 'Megerősítés'}
        </PrimaryButton>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

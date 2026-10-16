'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logMfaChange } from '@/app/[locale]/admin/actions';
import { MfaEnrollForm } from '@/components/admin/MfaEnrollForm';
import { SecondaryButton } from '@/components/admin/ui';
import { Collapse } from '@/components/ui/collapse';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatAdminDate } from '@/lib/invite-codes';

interface Device {
  id: string;
  name: string;
  createdAt: string;
}

async function fetchDevices(): Promise<Device[]> {
  const { data } = await createClient().auth.mfa.listFactors();
  return (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name || 'Hitelesítő app', createdAt: f.created_at }));
}

/** Verified authenticator devices; a second one is the backup if the phone is lost. */
export function MfaDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = () => fetchDevices().then(setDevices);

  useEffect(() => {
    fetchDevices().then(setDevices);
  }, []);

  const remove = async (device: Device) => {
    const ok = await confirm({
      message: `Biztosan eltávolítod ezt az eszközt? „${device.name}” – utána azzal már nem tudsz belépni az admin felületre.`,
      confirmLabel: 'Eltávolítás',
      cancelLabel: 'Mégse',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({ factorId: device.id });
    if (unenrollError) {
      setError('Nem sikerült eltávolítani az eszközt.');
      return;
    }
    await logMfaChange('remove', device.name);
    await load();
  };

  return (
    <section className="premium-card p-5">
      <h2 className="font-display text-lg font-semibold text-gradient-gold">Kétlépcsős eszközök</h2>
      {devices === null ? (
        <p className="mt-3 text-sm text-muted-foreground">Betöltés…</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border/30">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2">
                <Smartphone className="h-4 w-4 shrink-0 text-accent/80" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cream">{d.name}</p>
                  <p className="text-xs text-muted-foreground">Hozzáadva: {formatAdminDate(d.createdAt, false)}</p>
                </div>
                {/* The last device cannot be removed: that would lock the admin area */}
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => void remove(d)}
                    aria-label={`${d.name} eltávolítása`}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {devices.length === 1 && (
            <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
              Csak egy eszközöd van. Ha elveszik, nem tudsz belépni az admin felületre — érdemes egy második eszközt is hozzáadni
              (pl. jelszókezelő vagy másik telefon).
            </p>
          )}
          {!adding && (
            <SecondaryButton className="mt-3" onClick={() => setAdding(true)}>
              + Eszköz hozzáadása
            </SecondaryButton>
          )}
          <Collapse open={adding}>
            <div className="mt-4 border-t border-border/30 pt-4">
              {adding && (
                <MfaEnrollForm
                  existingCount={devices.length}
                  onDone={() => {
                    setAdding(false);
                    void load();
                  }}
                />
              )}
            </div>
          </Collapse>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </>
      )}
      {confirmDialog}
    </section>
  );
}

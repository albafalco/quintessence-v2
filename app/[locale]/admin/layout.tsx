import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminState } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { MfaGate } from '@/components/admin/MfaGate';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Admin area (Hungarian only). Non-admins get a plain 404 so the area's
 * existence is not revealed. Pages and actions re-check access themselves.
 */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'hu') notFound();

  const { state } = await getAdminState();
  if (state === 'none') notFound();
  if (state !== 'ok') return <MfaGate mode={state} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent/70">Adminisztráció</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient-gold">Admin felület</h1>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}

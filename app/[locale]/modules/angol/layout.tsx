import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canUseAngol } from '@/lib/module-access';

/** Kreatív Angol is a locked module: without access it answers as if it did not exist. */
export default async function AngolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  if (!(await canUseAngol(supabase, locale))) notFound();
  return children;
}

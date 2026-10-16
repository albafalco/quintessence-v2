import { getAdminState } from '@/lib/admin';
import { announcementStatus, type AnnouncementRow } from '@/lib/announcements';
import { AnnouncementManager } from '@/components/admin/AnnouncementManager';

export default async function AdminAnnouncementsPage() {
  const { state, supabase } = await getAdminState();
  if (state !== 'ok') return null;

  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[admin/announcements] load failed:', error.message);
    return <p className="premium-card p-5 text-sm text-red-400">Nem sikerült betölteni a közleményeket. Le van futtatva a 013-as migráció?</p>;
  }

  const announcements = ((data ?? []) as AnnouncementRow[]).map((a) => ({ ...a, status: announcementStatus(a) }));
  return <AnnouncementManager announcements={announcements} />;
}

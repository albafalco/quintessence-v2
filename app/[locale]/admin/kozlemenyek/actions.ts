'use server';

import { revalidatePath } from 'next/cache';
import { AdminAuthError, logAdminAction, requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAnnouncementPush } from '@/lib/announcement-push';
import {
  ANNOUNCEMENT_LIMITS,
  TRANSLATION_LOCALES,
  isValidAnnouncementLink,
  type AnnouncementAudience,
  type AnnouncementKind,
  type AnnouncementTranslations,
} from '@/lib/announcements';
import type { ActionResult } from '@/app/[locale]/admin/actions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AnnouncementInput {
  id?: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  translations: AnnouncementTranslations;
  linkUrl: string;
  linkLabel: string;
  audience: AnnouncementAudience;
  /** draft: not visible; now: publish immediately; schedule: at publishAt */
  publishMode: 'draft' | 'now' | 'schedule';
  publishAt: string | null;
  expiresAt: string | null;
  sendPush: boolean;
}

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminAuthError) return { ok: false, error: 'Nincs jogosultságod, vagy lejárt az admin munkamenet. Töltsd újra az oldalt.' };
  console.error('[admin/announcements] action failed:', err);
  return { ok: false, error: 'Váratlan hiba történt.' };
}

function refresh() {
  revalidatePath('/[locale]/admin', 'layout');
}

function cleanTranslations(input: AnnouncementTranslations): AnnouncementTranslations {
  const out: AnnouncementTranslations = {};
  for (const locale of TRANSLATION_LOCALES) {
    const tr = input?.[locale];
    if (!tr) continue;
    const title = (tr.title ?? '').trim().slice(0, ANNOUNCEMENT_LIMITS.title);
    const body = (tr.body ?? '').trim().slice(0, ANNOUNCEMENT_LIMITS.body);
    const linkLabel = (tr.link_label ?? '').trim().slice(0, ANNOUNCEMENT_LIMITS.linkLabel);
    if (title || body || linkLabel) out[locale] = { ...(title && { title }), ...(body && { body }), ...(linkLabel && { link_label: linkLabel }) };
  }
  return out;
}

export async function saveAnnouncement(input: AnnouncementInput): Promise<ActionResult<{ id: string; pushed: number | null }>> {
  try {
    const { supabase, user } = await requireAdmin();

    if (!['news', 'content', 'system'].includes(input.kind)) return { ok: false, error: 'Ismeretlen fajta.' };
    if (!['all', 'hu'].includes(input.audience)) return { ok: false, error: 'Ismeretlen célközönség.' };
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) return { ok: false, error: 'A cím kötelező.' };
    if (title.length > ANNOUNCEMENT_LIMITS.title) return { ok: false, error: `A cím legfeljebb ${ANNOUNCEMENT_LIMITS.title} karakter lehet.` };
    if (body.length > ANNOUNCEMENT_LIMITS.body) return { ok: false, error: `A szöveg legfeljebb ${ANNOUNCEMENT_LIMITS.body} karakter lehet.` };

    const linkUrl = input.linkUrl.trim();
    if (linkUrl && !isValidAnnouncementLink(linkUrl)) {
      return { ok: false, error: 'A link „/”-rel kezdődő app-útvonal (pl. /modules/angol) vagy https:// cím lehet.' };
    }

    let publishAt: string | null = null;
    if (input.publishMode === 'now') publishAt = new Date().toISOString();
    if (input.publishMode === 'schedule') {
      const date = input.publishAt ? new Date(input.publishAt) : null;
      if (!date || Number.isNaN(date.getTime())) return { ok: false, error: 'Adj meg közzétételi időpontot.' };
      publishAt = date.toISOString();
    }

    let expiresAt: string | null = null;
    if (input.expiresAt) {
      const date = new Date(input.expiresAt);
      if (Number.isNaN(date.getTime())) return { ok: false, error: 'Érvénytelen lejárat.' };
      if (publishAt && date.getTime() <= new Date(publishAt).getTime()) return { ok: false, error: 'A lejárat a közzététel utáni időpont legyen.' };
      expiresAt = date.toISOString();
    }

    const row = {
      kind: input.kind,
      title,
      body,
      translations: cleanTranslations(input.translations),
      link_url: linkUrl || null,
      link_label: linkUrl ? input.linkLabel.trim().slice(0, ANNOUNCEMENT_LIMITS.linkLabel) || null : null,
      audience: input.audience,
      publish_at: publishAt,
      expires_at: expiresAt,
      send_push: input.sendPush,
      updated_at: new Date().toISOString(),
    };

    let id = input.id;
    if (id) {
      if (!UUID_RE.test(id)) return { ok: false, error: 'Ismeretlen közlemény.' };
      // Keep the original publish time when an already published item is only edited
      const { data: existing } = await supabase.from('announcements').select('publish_at').eq('id', id).maybeSingle();
      if (!existing) return { ok: false, error: 'Ismeretlen közlemény.' };
      if (input.publishMode === 'now' && existing.publish_at && new Date(existing.publish_at).getTime() <= Date.now()) {
        row.publish_at = existing.publish_at;
      }
      const { error } = await supabase.from('announcements').update(row).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase.from('announcements').insert({ ...row, created_by: user.id }).select('id').single();
      if (error) throw new Error(error.message);
      id = data.id as string;
    }

    // Immediate push for "publish now" (scheduled ones are sent by the cron)
    let pushed: number | null = null;
    if (input.sendPush && input.publishMode === 'now') {
      const service = await createServiceClient();
      pushed = (await sendAnnouncementPush(service, { id: id!, title, body, translations: row.translations, audience: input.audience })).sent;
    }

    await logAdminAction(supabase, user.id, input.id ? 'announcement.update' : 'announcement.create', title, {
      mode: input.publishMode,
      push: input.sendPush,
      pushed,
    });
    refresh();
    return { ok: true, data: { id: id!, pushed } };
  } catch (err) {
    return failure(err);
  }
}

/** Back to draft: disappears from users' bells (read marks are kept). */
export async function unpublishAnnouncement(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    if (!UUID_RE.test(id)) return { ok: false, error: 'Ismeretlen közlemény.' };
    const { data, error } = await supabase.from('announcements').update({ publish_at: null }).eq('id', id).select('title').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false, error: 'Ismeretlen közlemény.' };
    await logAdminAction(supabase, user.id, 'announcement.unpublish', data.title);
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    if (!UUID_RE.test(id)) return { ok: false, error: 'Ismeretlen közlemény.' };
    const { data, error } = await supabase.from('announcements').delete().eq('id', id).select('title').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false, error: 'Ismeretlen közlemény.' };
    await logAdminAction(supabase, user.id, 'announcement.delete', data.title);
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { deleteAnnouncement, saveAnnouncement, unpublishAnnouncement, type AnnouncementInput } from '@/app/[locale]/admin/kozlemenyek/actions';
import { PrimaryButton, SecondaryButton } from '@/components/admin/ui';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Collapse } from '@/components/ui/collapse';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  ANNOUNCEMENT_LIMITS,
  TRANSLATION_LOCALES,
  type AnnouncementKind,
  type AnnouncementRow,
  type AnnouncementStatus,
  type TranslationLocale,
} from '@/lib/announcements';
import { formatAdminDate } from '@/lib/invite-codes';
import { localizeHref, type ResolvedNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';
import { LANGUAGES } from '@/lib/languages';

type AnnouncementWithStatus = AnnouncementRow & { status: AnnouncementStatus };

const KINDS: { id: AnnouncementKind; icon: string; label: string }[] = [
  { id: 'news', icon: 'sparkles', label: 'Hír' },
  { id: 'content', icon: 'book', label: 'Új tartalom' },
  { id: 'system', icon: 'alert', label: 'Rendszerüzenet' },
];

const STATUS_META: Record<AnnouncementStatus, { label: string; className: string }> = {
  draft: { label: 'Piszkozat', className: 'bg-muted/50 text-muted-foreground' },
  scheduled: { label: 'Ütemezett', className: 'bg-primary/30 text-accent-light' },
  published: { label: 'Megjelent', className: 'bg-green-500/10 text-green-300' },
  expired: { label: 'Lejárt', className: 'bg-muted/40 text-muted-foreground' },
};

const fieldClass =
  'w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/60 focus:outline-none';

/** ISO → value of a datetime-local input (browser time zone). */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  id?: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  linkUrl: string;
  linkLabel: string;
  audience: 'all' | 'hu';
  publishMode: 'draft' | 'now' | 'schedule';
  publishAt: string;
  expiresAt: string;
  sendPush: boolean;
  pushSentAt: string | null;
  /** Fixed time for the preview's "just now" label */
  previewAt: string;
  translations: Record<TranslationLocale, { title: string; body: string; link_label: string }>;
}

const emptyTranslations = () =>
  Object.fromEntries(TRANSLATION_LOCALES.map((l) => [l, { title: '', body: '', link_label: '' }])) as FormState['translations'];

function emptyForm(): FormState {
  return {
    kind: 'news',
    title: '',
    body: '',
    linkUrl: '',
    linkLabel: '',
    audience: 'all',
    publishMode: 'now',
    publishAt: '',
    expiresAt: '',
    sendPush: false,
    pushSentAt: null,
    previewAt: new Date().toISOString(),
    translations: emptyTranslations(),
  };
}

function formFrom(a: AnnouncementWithStatus): FormState {
  const translations = emptyTranslations();
  for (const l of TRANSLATION_LOCALES) {
    const tr = a.translations?.[l];
    if (tr) translations[l] = { title: tr.title ?? '', body: tr.body ?? '', link_label: tr.link_label ?? '' };
  }
  return {
    id: a.id,
    kind: a.kind,
    title: a.title,
    body: a.body,
    linkUrl: a.link_url ?? '',
    linkLabel: a.link_label ?? '',
    audience: a.audience,
    publishMode: a.status === 'draft' ? 'draft' : a.status === 'scheduled' ? 'schedule' : 'now',
    publishAt: toLocalInput(a.publish_at),
    expiresAt: toLocalInput(a.expires_at),
    sendPush: a.send_push,
    pushSentAt: a.push_sent_at,
    previewAt: new Date().toISOString(),
    translations,
  };
}

export function AnnouncementManager({ announcements }: { announcements: AnnouncementWithStatus[] }) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [form, setForm] = useState<FormState | null>(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setTr = (locale: TranslationLocale, key: 'title' | 'body' | 'link_label', value: string) =>
    setForm((f) => (f ? { ...f, translations: { ...f.translations, [locale]: { ...f.translations[locale], [key]: value } } } : f));

  const startNew = () => {
    setForm(emptyForm());
    setShowTranslations(false);
    setError(null);
    setNotice(null);
  };

  const startEdit = (a: AnnouncementWithStatus) => {
    setForm(formFrom(a));
    setShowTranslations(TRANSLATION_LOCALES.some((l) => a.translations?.[l]));
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    if (!form) return;
    if (form.publishMode === 'now' && form.sendPush && !form.pushSentAt) {
      const ok = await confirm({
        message: 'A közlemény azonnal megjelenik, és push-értesítés megy minden érintett felhasználó eszközére. Mehet?',
        confirmLabel: 'Közzététel és push',
        cancelLabel: 'Mégse',
      });
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    const input: AnnouncementInput = {
      id: form.id,
      kind: form.kind,
      title: form.title,
      body: form.body,
      translations: form.translations,
      linkUrl: form.linkUrl,
      linkLabel: form.linkLabel,
      audience: form.audience,
      publishMode: form.publishMode,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      sendPush: form.sendPush,
    };
    const result = await saveAnnouncement(input);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const pushed = result.data?.pushed;
    setNotice(
      form.publishMode === 'draft'
        ? 'Piszkozat elmentve.'
        : form.publishMode === 'schedule'
          ? 'Közlemény ütemezve.'
          : `Közlemény közzétéve${pushed !== null && pushed !== undefined ? ` · push: ${pushed} eszköz` : ''}.`
    );
    setForm(null);
    router.refresh();
  };

  const unpublish = async (a: AnnouncementWithStatus) => {
    const ok = await confirm({
      message: `„${a.title}” visszakerül piszkozatba, és eltűnik a felhasználók csengőjéből.`,
      confirmLabel: 'Visszavonás',
      cancelLabel: 'Mégse',
    });
    if (!ok) return;
    const result = await unpublishAnnouncement(a.id);
    if (!result.ok) setError(result.error);
    router.refresh();
  };

  const remove = async (a: AnnouncementWithStatus) => {
    const ok = await confirm({
      message: `Véglegesen törlöd: „${a.title}”?`,
      confirmLabel: 'Törlés',
      cancelLabel: 'Mégse',
      destructive: true,
    });
    if (!ok) return;
    const result = await deleteAnnouncement(a.id);
    if (!result.ok) setError(result.error);
    if (form?.id === a.id) setForm(null);
    router.refresh();
  };

  const preview: ResolvedNotification | null = form
    ? {
        row: {
          id: 'preview',
          source: 'announcement',
          kind: form.kind,
          title: form.title,
          body: form.body,
          translations: null,
          link_url: form.linkUrl,
          link_label: form.linkLabel,
          data: null,
          created_at: form.previewAt,
          expires_at: null,
          is_read: false,
        },
        category: form.kind,
        icon: KINDS.find((k) => k.id === form.kind)!.icon,
        title: form.title || 'Cím',
        body: form.body,
        href: localizeHref(form.linkUrl, 'hu'),
        linkLabel: form.linkLabel || null,
        expired: false,
      }
    : null;

  const saveLabel = form?.publishMode === 'draft' ? 'Mentés piszkozatként' : form?.publishMode === 'schedule' ? 'Ütemezés' : form?.id ? 'Mentés' : 'Közzététel';

  return (
    <div className="space-y-6">
      {!form && (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={startNew} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Új közlemény
          </PrimaryButton>
          {notice && <p className="animate-fade-up text-sm text-green-400 motion-reduce:animate-none">{notice}</p>}
        </div>
      )}

      <Collapse open={form !== null}>
        {form && (
          <section className="premium-card space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold text-gradient-gold">{form.id ? 'Közlemény szerkesztése' : 'Új közlemény'}</h2>

            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => set('kind', k.id)}
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    form.kind === k.id ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border/50 text-muted-foreground hover:text-cream'
                  )}
                >
                  <AppIcon name={k.icon} className="mr-1.5 h-3.5 w-3.5" />
                  {k.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Cím</span>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                maxLength={ANNOUNCEMENT_LIMITS.title}
                placeholder="pl. Megérkezett a 2. lecke"
                className={cn(fieldClass, 'h-10')}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-xs text-muted-foreground">
                <span>Szöveg</span>
                <span>{form.body.length}/{ANNOUNCEMENT_LIMITS.body}</span>
              </span>
              <textarea
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                maxLength={ANNOUNCEMENT_LIMITS.body}
                rows={5}
                className={cn(fieldClass, 'resize-y py-2 leading-relaxed')}
              />
              <span className="text-[11px] text-muted-foreground">
                Formázás: <code className="text-accent/80">**félkövér**</code> · <code className="text-accent/80">[szöveg](/modules/magia/ma)</code> · üres sor = új bekezdés
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Gomb linkje (nem kötelező)</span>
                <input value={form.linkUrl} onChange={(e) => set('linkUrl', e.target.value)} placeholder="/modules/magia/ma vagy https://…" className={cn(fieldClass, 'h-10')} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Gomb felirata</span>
                <input
                  value={form.linkLabel}
                  onChange={(e) => set('linkLabel', e.target.value)}
                  maxLength={ANNOUNCEMENT_LIMITS.linkLabel}
                  placeholder="pl. Megnézem"
                  disabled={!form.linkUrl}
                  className={cn(fieldClass, 'h-10 disabled:opacity-40')}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Kinek szól</span>
                <select value={form.audience} onChange={(e) => set('audience', e.target.value as FormState['audience'])} className={cn(fieldClass, 'h-10')}>
                  <option value="all">Mindenkinek</option>
                  <option value="hu">Csak magyar felület</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Közzététel</span>
                <select value={form.publishMode} onChange={(e) => set('publishMode', e.target.value as FormState['publishMode'])} className={cn(fieldClass, 'h-10')}>
                  <option value="now">{form.id && form.publishMode === 'now' ? 'Megjelent' : 'Most'}</option>
                  <option value="schedule">Időpontban…</option>
                  <option value="draft">Piszkozat</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Lejárat (nem kötelező)</span>
                <input type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} className={cn(fieldClass, 'h-10')} />
              </label>
            </div>
            {form.publishMode === 'schedule' && (
              <label className="flex flex-col gap-1 sm:w-1/3">
                <span className="text-xs text-muted-foreground">Megjelenés időpontja</span>
                <input type="datetime-local" value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} className={cn(fieldClass, 'h-10')} />
              </label>
            )}

            <label className={cn('flex items-center gap-2 text-sm', form.pushSentAt ? 'text-muted-foreground' : 'text-cream')}>
              <input
                type="checkbox"
                checked={form.sendPush}
                disabled={Boolean(form.pushSentAt) || form.publishMode === 'draft'}
                onChange={(e) => set('sendPush', e.target.checked)}
                className="h-4 w-4 accent-yellow-500"
              />
              Push-értesítés is
              {form.pushSentAt && <span className="text-xs">(elküldve: {formatAdminDate(form.pushSentAt)})</span>}
              {!form.pushSentAt && form.publishMode === 'schedule' && form.sendPush && <span className="text-xs text-muted-foreground">(a megjelenéskor megy ki)</span>}
            </label>

            <div>
              <button type="button" onClick={() => setShowTranslations((v) => !v)} className="text-sm font-medium text-accent hover:underline" aria-expanded={showTranslations}>
                {showTranslations ? '▴' : '▸'} Fordítások (nem kötelező — ha hiányzik, a magyar jelenik meg)
              </button>
              <Collapse open={showTranslations}>
                <div className="mt-3 space-y-4">
                  {TRANSLATION_LOCALES.map((l) => (
                    <div key={l} className="space-y-2 rounded-xl border border-border/40 p-3">
                      <p className="text-xs font-semibold text-accent/80">{LANGUAGES[l].nativeName}</p>
                      <input value={form.translations[l].title} onChange={(e) => setTr(l, 'title', e.target.value)} maxLength={ANNOUNCEMENT_LIMITS.title} placeholder="Cím" className={cn(fieldClass, 'h-9')} />
                      <textarea value={form.translations[l].body} onChange={(e) => setTr(l, 'body', e.target.value)} maxLength={ANNOUNCEMENT_LIMITS.body} rows={3} placeholder="Szöveg" className={cn(fieldClass, 'resize-y py-2')} />
                      {form.linkUrl && (
                        <input value={form.translations[l].link_label} onChange={(e) => setTr(l, 'link_label', e.target.value)} maxLength={ANNOUNCEMENT_LIMITS.linkLabel} placeholder="Gomb felirata" className={cn(fieldClass, 'h-9')} />
                      )}
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>

            {preview && (
              <div className="space-y-2 border-t border-border/30 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">Előnézet</p>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card-elevated/95">
                  <NotificationItem item={preview} variant="compact" />
                </div>
                <NotificationItem item={preview} variant="full" />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => setForm(null)} disabled={busy}>
                Mégse
              </SecondaryButton>
              <PrimaryButton onClick={() => void save()} disabled={busy || !form.title.trim()}>
                {busy ? 'Mentés…' : saveLabel}
              </PrimaryButton>
            </div>
          </section>
        )}
      </Collapse>

      <section className="space-y-3">
        {announcements.length === 0 ? (
          <p className="premium-card p-6 text-center text-sm text-muted-foreground">Még nincs közlemény.</p>
        ) : (
          announcements.map((a) => (
            <article key={a.id} className="premium-card p-4">
              <div className="flex items-start gap-3">
                <AppIcon name={KINDS.find((k) => k.id === a.kind)?.icon ?? 'sparkles'} className="mt-1 h-5 w-5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-cream">{a.title}</p>
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', STATUS_META[a.status].className)}>{STATUS_META[a.status].label}</span>
                    {a.audience === 'hu' && <span className="rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">csak HU</span>}
                    {a.push_sent_at && <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">push ✓</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.publish_at ? `${a.status === 'scheduled' ? 'Megjelenik' : 'Megjelent'}: ${formatAdminDate(a.publish_at)}` : `Létrehozva: ${formatAdminDate(a.created_at)}`}
                    {a.expires_at && <> · Lejár: {formatAdminDate(a.expires_at)}</>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => startEdit(a)} aria-label="Szerkesztés" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-cream">
                    <Pencil className="h-4 w-4" />
                  </button>
                  {a.status !== 'draft' && (
                    <button type="button" onClick={() => void unpublish(a)} aria-label="Visszavonás piszkozatba" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-cream">
                      <Undo2 className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => void remove(a)} aria-label="Törlés" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
      {confirmDialog}
    </div>
  );
}

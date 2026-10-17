'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDurationLabel } from '@/lib/magia-utils';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toIntlLocale } from '@/i18n';

export interface JournalEntryData {
  id: string;
  fokozat: number | null;
  entry_date: string;
  content: string | null;
  successes?: string | null;
  failures?: string | null;
  duration_sec?: number | null;
  disturbances?: string | null;
  self_criticism?: string | null;
  next_plan?: string | null;
  created_at: string;
  updated_at: string;
}

const EDITABLE_FIELDS = ['successes', 'failures', 'disturbances', 'self_criticism', 'next_plan', 'content'] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];
type EditForm = Record<EditableField, string>;

function toForm(entry: JournalEntryData): EditForm {
  return {
    successes: entry.successes ?? '',
    failures: entry.failures ?? '',
    disturbances: entry.disturbances ?? '',
    self_criticism: entry.self_criticism ?? '',
    next_plan: entry.next_plan ?? '',
    content: entry.content ?? '',
  };
}

interface JournalEntryProps {
  entry: JournalEntryData;
  onUpdate: (entry: JournalEntryData) => void;
  onDelete: (id: string) => void;
}

export function JournalEntry({ entry, onUpdate, onDelete }: JournalEntryProps) {
  const t = useTranslations('magia');
  const formatDuration = (sec: number) => formatDurationLabel(sec, t);
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(() => toForm(entry));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const FIELD_LABELS: Record<EditableField, string> = {
    successes: t('journalFieldSuccesses'),
    failures: t('journalFieldFailures'),
    disturbances: t('journalFieldDisturbances'),
    self_criticism: t('journalFieldSelfCriticism'),
    next_plan: t('journalFieldNextPlan'),
    content: t('journalFieldContent'),
  };
  const isFormEmpty = EDITABLE_FIELDS.every((k) => !form[k].trim());

  const startEditing = () => {
    setForm(toForm(entry));
    setError(null);
    setEditing(true);
  };

  const STRUCTURED_FIELDS: { key: keyof JournalEntryData; label: string }[] = [
    { key: 'successes', label: t('journalFieldSuccessesShort') },
    { key: 'failures', label: t('journalFieldFailuresShort') },
    { key: 'duration_sec', label: t('journalFieldDuration') },
    { key: 'disturbances', label: t('journalFieldDisturbancesShort') },
    { key: 'self_criticism', label: t('journalFieldSelfCriticismShort') },
    { key: 'next_plan', label: t('journalFieldNextPlanShort') },
    { key: 'content', label: t('journalFieldContentShort') },
  ];

  const formattedDate = new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(entry.entry_date + 'T00:00:00Z'));

  const hasStructured = STRUCTURED_FIELDS.slice(0, -1).some(
    (f) => f.key !== 'duration_sec' && entry[f.key]
  );

  const handleSave = async () => {
    const original = toForm(entry);
    const changed = EDITABLE_FIELDS.some((k) => form[k].trim() !== original[k].trim());
    if (!changed) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('magia_journal')
      .update({
        // content is NOT NULL in the schema; the other fields are optional
        content: form.content.trim(),
        successes: form.successes.trim() || null,
        failures: form.failures.trim() || null,
        disturbances: form.disturbances.trim() || null,
        self_criticism: form.self_criticism.trim() || null,
        next_plan: form.next_plan.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)
      .select()
      .single();

    setSaving(false);
    if (updateError || !data) {
      console.error('[magia] journal update failed', updateError);
      setError(t('saveFailed'));
      return;
    }
    onUpdate(data as JournalEntryData);
    setEditing(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: t('deleteConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('magia_journal').delete().eq('id', entry.id);
    setDeleting(false);
    if (deleteError) {
      console.error('[magia] journal delete failed', deleteError);
      setError(t('saveFailed'));
      return;
    }
    onDelete(entry.id);
  };

  return (
    <article
      className={cn(
        'premium-card border-l-2 border-l-accent/40 p-5 transition-opacity',
        deleting && 'opacity-50'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <time className="text-sm font-semibold text-accent">{formattedDate}</time>
        <div className="flex gap-3">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-accent"
              >
                {t('edit')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-red-400/70 transition-colors hover:text-red-400"
              >
                {t('delete')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || isFormEmpty}
                className="text-xs font-medium text-accent transition-colors hover:text-accent-light disabled:opacity-50"
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button
                type="button"
                onClick={() => { setError(null); setEditing(false); }}
                disabled={saving}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-cream"
              >
                {t('cancel')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Strukturált mezők */}
      {hasStructured && !editing && (
        <div className="mb-3 space-y-2">
          {STRUCTURED_FIELDS.filter((f) => f.key !== 'content').map((f) => {
            const val = entry[f.key];
            if (!val) return null;
            return (
              <div key={f.key} className="text-sm">
                <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-accent/50">
                  {f.label}:
                </span>
                <span className="text-cream/85">
                  {f.key === 'duration_sec' ? formatDuration(val as number) : (val as string)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Szabad szöveg / szerkesztő */}
      {editing ? (
        <div className="space-y-3">
          {EDITABLE_FIELDS.map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {FIELD_LABELS[key]}
                <span className="ml-1 normal-case text-muted-foreground/40">{t('optional')}</span>
              </label>
              <Textarea
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                rows={key === 'content' ? 4 : 2}
                className="border-border/40 bg-background/30 text-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        entry.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/85">
            {entry.content}
          </p>
        )
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {!hasStructured && !entry.content && !editing && (
        <p className="text-sm text-muted-foreground italic">{t('journalNoContent')}</p>
      )}
      {confirmDialog}
    </article>
  );
}

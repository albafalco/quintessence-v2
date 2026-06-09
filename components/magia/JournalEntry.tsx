'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

interface JournalEntryProps {
  entry: JournalEntryData;
  onUpdate: (entry: JournalEntryData) => void;
  onDelete: (id: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} perc${s > 0 ? ` ${s} mp` : ''}` : `${s} mp`;
}

export function JournalEntry({ entry, onUpdate, onDelete }: JournalEntryProps) {
  const t = useTranslations('magia');
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const STRUCTURED_FIELDS: { key: keyof JournalEntryData; label: string }[] = [
    { key: 'successes', label: t('journalFieldSuccessesShort') },
    { key: 'failures', label: t('journalFieldFailuresShort') },
    { key: 'duration_sec', label: t('journalFieldDuration') },
    { key: 'disturbances', label: t('journalFieldDisturbancesShort') },
    { key: 'self_criticism', label: t('journalFieldSelfCriticismShort') },
    { key: 'next_plan', label: t('journalFieldNextPlanShort') },
    { key: 'content', label: t('journalFieldContentShort') },
  ];

  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(entry.entry_date + 'T00:00:00Z'));

  const hasStructured = STRUCTURED_FIELDS.slice(0, -1).some(
    (f) => f.key !== 'duration_sec' && entry[f.key]
  );

  const handleSave = async () => {
    if (editContent.trim() === (entry.content ?? '')) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('magia_journal')
      .update({ content: editContent.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', entry.id)
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      onUpdate(data as JournalEntryData);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('magia_journal').delete().eq('id', entry.id);
    setDeleting(false);
    if (!error) onDelete(entry.id);
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
                onClick={() => setEditing(true)}
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
                disabled={saving || !editContent.trim()}
                className="text-xs font-medium text-accent transition-colors hover:text-accent-light disabled:opacity-50"
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button
                type="button"
                onClick={() => { setEditContent(entry.content ?? ''); setEditing(false); }}
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
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={5}
          className="border-border/40 bg-background/30"
        />
      ) : (
        entry.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/85">
            {entry.content}
          </p>
        )
      )}

      {!hasStructured && !entry.content && !editing && (
        <p className="text-sm text-muted-foreground italic">{t('journalNoContent')}</p>
      )}
    </article>
  );
}

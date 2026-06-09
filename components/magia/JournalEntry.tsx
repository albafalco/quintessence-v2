'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface JournalEntryData {
  id: string;
  fokozat: number | null;
  entry_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface JournalEntryProps {
  entry: JournalEntryData;
  onUpdate: (entry: JournalEntryData) => void;
  onDelete: (id: string) => void;
}

export function JournalEntry({ entry, onUpdate, onDelete }: JournalEntryProps) {
  const t = useTranslations('magia');
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(entry.entry_date));

  const handleSave = async () => {
    if (content.trim() === entry.content) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('magia_journal')
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
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
    const { error } = await supabase
      .from('magia_journal')
      .delete()
      .eq('id', entry.id);

    setDeleting(false);
    if (!error) {
      onDelete(entry.id);
    }
  };

  const handleCancel = () => {
    setContent(entry.content);
    setEditing(false);
  };

  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        deleting && 'opacity-50'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <time className="text-sm font-medium text-accent">{formattedDate}</time>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('edit')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-400/80 transition-colors hover:text-red-400"
              >
                {t('delete')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="text-xs text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('cancel')}
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {entry.content}
        </p>
      )}
    </article>
  );
}
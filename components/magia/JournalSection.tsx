'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { JournalEntry, type JournalEntryData } from './JournalEntry';

interface JournalSectionProps {
  fokozatId: number;
  userId: string;
  initialEntries: JournalEntryData[];
}

export function JournalSection({
  fokozatId,
  userId,
  initialEntries,
}: JournalSectionProps) {
  const t = useTranslations('magia');
  const [entries, setEntries] = useState(initialEntries);
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    if (!newContent.trim()) return;

    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('magia_journal')
      .insert({
        user_id: userId,
        fokozat: fokozatId,
        content: newContent.trim(),
        entry_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    setAdding(false);
    if (!error && data) {
      setEntries((prev) => [data as JournalEntryData, ...prev]);
      setNewContent('');
      setShowForm(false);
    }
  };

  const handleUpdate = (updated: JournalEntryData) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <section id="journal" className="scroll-mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t('journal')}
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + {t('addJournalEntry')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={5}
            placeholder={t('newEntryPlaceholder')}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newContent.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewContent('');
              }}
              disabled={adding}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noEntries')}</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <JournalEntry
              key={entry.id}
              entry={entry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
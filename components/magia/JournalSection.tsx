'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    <section id="journal" className="scroll-mt-8 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-gradient-gold">
          {t('journal')}
        </h2>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t('addJournalEntry')}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="premium-card magia-surface p-5">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={5}
            placeholder={t('newEntryPlaceholder')}
            className="border-border/40 bg-background/30"
          />
          <div className="mt-4 flex gap-2">
            <Button variant="gold" onClick={handleAdd} disabled={adding || !newContent.trim()}>
              {adding ? t('saving') : t('save')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setNewContent('');
              }}
              disabled={adding}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
          {t('noEntries')}
        </p>
      ) : (
        <div className="space-y-4">
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
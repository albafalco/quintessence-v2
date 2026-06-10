'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Download, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { JournalEntry, type JournalEntryData } from './JournalEntry';

interface JournalSectionProps {
  fokozatId: number;
  userId: string;
  initialEntries: JournalEntryData[];
}

interface StructuredEntry {
  successes: string;
  failures: string;
  disturbances: string;
  self_criticism: string;
  next_plan: string;
  content: string;
}

const EMPTY_FORM: StructuredEntry = {
  successes: '',
  failures: '',
  disturbances: '',
  self_criticism: '',
  next_plan: '',
  content: '',
};

const FIELD_KEYS = ['successes', 'failures', 'disturbances', 'self_criticism', 'next_plan', 'content'] as const;
type FieldKey = typeof FIELD_KEYS[number];

function entryToMarkdown(
  entry: JournalEntryData,
  labels: Record<FieldKey, string>
): string {
  const lines: string[] = [`## ${entry.entry_date}`];
  if (entry.successes) lines.push(`### ${labels.successes}\n${entry.successes}`);
  if (entry.failures) lines.push(`### ${labels.failures}\n${entry.failures}`);
  if (entry.duration_sec) lines.push(`### ${labels.disturbances}\n${Math.floor(entry.duration_sec / 60)} min`);
  if (entry.disturbances) lines.push(`### ${labels.disturbances}\n${entry.disturbances}`);
  if (entry.self_criticism) lines.push(`### ${labels.self_criticism}\n${entry.self_criticism}`);
  if (entry.next_plan) lines.push(`### ${labels.next_plan}\n${entry.next_plan}`);
  if (entry.content) lines.push(`### ${labels.content}\n${entry.content}`);
  return lines.join('\n\n');
}

function exportJSON(entries: JournalEntryData[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `magia-naplo-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function JournalSection({
  fokozatId,
  userId,
  initialEntries,
}: JournalSectionProps) {
  const t = useTranslations('magia');
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState<StructuredEntry>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const FIELD_META: Record<FieldKey, { label: string; placeholder: string }> = {
    successes: { label: t('journalFieldSuccesses'), placeholder: t('journalPlaceholderSuccesses') },
    failures: { label: t('journalFieldFailures'), placeholder: t('journalPlaceholderFailures') },
    disturbances: { label: t('journalFieldDisturbances'), placeholder: t('journalPlaceholderDisturbances') },
    self_criticism: { label: t('journalFieldSelfCriticism'), placeholder: t('journalPlaceholderSelfCriticism') },
    next_plan: { label: t('journalFieldNextPlan'), placeholder: t('journalPlaceholderNextPlan') },
    content: { label: t('journalFieldContent'), placeholder: t('journalPlaceholderContent') },
  };

  const markdownLabels: Record<FieldKey, string> = {
    successes: t('journalFieldSuccesses'),
    failures: t('journalFieldFailures'),
    disturbances: t('journalFieldDisturbances'),
    self_criticism: t('journalFieldSelfCriticism'),
    next_plan: t('journalFieldNextPlan'),
    content: t('journalFieldContent'),
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) =>
      [e.content, e.successes, e.failures, e.disturbances, e.self_criticism, e.next_plan, e.entry_date]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const isFormEmpty = FIELD_KEYS.every((k) => !form[k].trim());

  const handleAdd = async () => {
    if (isFormEmpty) return;

    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('magia_journal')
      .insert({
        user_id: userId,
        fokozat: fokozatId,
        entry_date: new Date().toISOString().split('T')[0],
        content: form.content.trim() || null,
        successes: form.successes.trim() || null,
        failures: form.failures.trim() || null,
        disturbances: form.disturbances.trim() || null,
        self_criticism: form.self_criticism.trim() || null,
        next_plan: form.next_plan.trim() || null,
      })
      .select()
      .single();

    setAdding(false);
    if (!error && data) {
      setEntries((prev) => [data as JournalEntryData, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
  };

  const handleUpdate = (updated: JournalEntryData) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <section id="journal" className="scroll-mt-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-gradient-gold">
          {t('journal')}
        </h2>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu((v) => !v)}
              >
                <Download className="h-4 w-4" />
                {t('journalExport')}
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-border/40 bg-background shadow-lg">
                  <button
                    type="button"
                    onClick={() => { exportJSON(entries); setShowExportMenu(false); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-cream hover:bg-muted/40"
                  >
                    {t('journalExportJson')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const md = `${t('journalExportHeader')}\n\n${entries.map((e) => entryToMarkdown(e, markdownLabels)).join('\n\n---\n\n')}`;
                      const blob = new Blob([md], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `magia-naplo-${new Date().toISOString().split('T')[0]}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowExportMenu(false);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-cream hover:bg-muted/40"
                  >
                    {t('journalExportMarkdown')}
                  </button>
                </div>
              )}
            </div>
          )}
          {!showForm && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              {t('addJournalEntry')}
            </Button>
          )}
        </div>
      </div>

      {/* Kereső */}
      {entries.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('journalSearchPlaceholder')}
            className="w-full rounded-xl border border-border/40 bg-background/40 py-2.5 pl-9 pr-4 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/50 focus:outline-none"
          />
        </div>
      )}

      {/* Új bejegyzés form */}
      {showForm && (
        <div className="premium-card magia-surface space-y-4 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-accent/60">
            {t('journalNewEntry')}
          </p>
          {FIELD_KEYS.map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {FIELD_META[key].label}
                <span className="ml-1 normal-case text-muted-foreground/40">{t('optional')}</span>
              </label>
              <Textarea
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                rows={key === 'content' ? 3 : 2}
                placeholder={FIELD_META[key].placeholder}
                className="border-border/40 bg-background/30 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="gold" onClick={handleAdd} disabled={adding || isFormEmpty}>
              {adding ? t('saving') : t('save')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              disabled={adding}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
          {searchQuery ? t('journalNoResults') : t('noEntries')}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
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

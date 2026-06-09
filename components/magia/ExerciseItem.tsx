'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { buildExerciseKey } from '@/lib/magia-utils';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { MagiaSection } from '@/lib/magia-data';

interface ExerciseItemProps {
  fokozatId: number;
  section: MagiaSection;
  exerciseKey: string;
  title: string;
  description: string;
  initialCompleted?: boolean;
  initialNotes?: string;
  userId: string;
}

export function ExerciseItem({
  fokozatId,
  section,
  exerciseKey,
  title,
  description,
  initialCompleted = false,
  initialNotes = '',
  userId,
}: ExerciseItemProps) {
  const t = useTranslations('magia');
  const [completed, setCompleted] = useState(initialCompleted);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullKey = buildExerciseKey(section, fokozatId, exerciseKey);

  const saveProgress = useCallback(
    async (updates: { completed?: boolean; notes?: string }) => {
      setSaving(true);
      setError(null);

      const supabase = createClient();
      const { error: dbError } = await supabase.from('magia_progress').upsert(
        {
          user_id: userId,
          fokozat: fokozatId,
          section,
          exercise_key: fullKey,
          completed: updates.completed ?? completed,
          completed_at:
            (updates.completed ?? completed) ? new Date().toISOString() : null,
          notes: updates.notes ?? notes,
        },
        { onConflict: 'user_id,fokozat,section,exercise_key' }
      );

      setSaving(false);
      if (dbError) {
        setError(dbError.message);
      }
    },
    [userId, fokozatId, section, fullKey, completed, notes]
  );

  const handleToggle = async () => {
    const next = !completed;
    setCompleted(next);
    await saveProgress({ completed: next });
  };

  const handleNotesBlur = async () => {
    if (notes !== initialNotes) {
      await saveProgress({ notes });
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-card/40 p-5 transition-all duration-300',
        completed && 'border-accent/25 bg-accent/5 shadow-glow-gold'
      )}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200',
            completed
              ? 'border-accent bg-accent text-accent-foreground shadow-glow-gold'
              : 'border-muted-foreground/30 hover:border-accent/60 hover:shadow-glow-gold'
          )}
          aria-label={completed ? t('completed') : t('markDone')}
        >
          {completed && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              'font-display text-base font-medium text-cream',
              completed && 'text-muted-foreground line-through decoration-accent/40'
            )}
          >
            {title}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>

          <div className="mt-4">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-accent/60">
              {t('notes')}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              disabled={saving}
              rows={2}
              placeholder={t('notesPlaceholder')}
              className="border-border/40 bg-background/40 text-sm"
            />
          </div>

          {saving && <p className="mt-2 text-xs text-muted-foreground">{t('saving')}</p>}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
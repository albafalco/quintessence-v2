'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { buildExerciseKey } from '@/lib/magia-utils';
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
        'rounded-lg border border-border bg-card/50 p-4 transition-colors',
        completed && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
            completed
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/50 hover:border-primary'
          )}
          aria-label={completed ? t('completed') : t('markDone')}
        >
          {completed && (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              'font-medium text-foreground',
              completed && 'text-muted-foreground line-through'
            )}
          >
            {title}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted-foreground">
              {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              disabled={saving}
              rows={2}
              placeholder={t('notesPlaceholder')}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {saving && (
            <p className="mt-1 text-xs text-muted-foreground">{t('saving')}</p>
          )}
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
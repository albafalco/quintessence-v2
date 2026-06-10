'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { buildExerciseKey } from '@/lib/magia-utils';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseRunner } from './ExerciseRunner';
import { MagiaModal } from './MagiaModal';
import { MasteryDialog } from './MasteryDialog';
import { SoulMirrorEditor } from './SoulMirrorEditor';
import { cn } from '@/lib/utils';
import type { MagiaSection, ExerciseType, ExerciseParams, ExerciseStatus } from '@/lib/magia-types';

interface ExerciseItemProps {
  fokozatId: number;
  section: MagiaSection;
  exerciseKey: string;
  title: string;
  description: string;
  type?: ExerciseType;
  params?: ExerciseParams;
  successCriteria?: string;
  minSessions?: number;
  initialCompleted?: boolean;
  initialNotes?: string;
  initialStatus?: ExerciseStatus;
  initialSessionCount?: number;
  userId: string;
  onMasteryChange?: () => void;
}

export function ExerciseItem({
  fokozatId,
  section,
  exerciseKey,
  title,
  description,
  type = 'practice',
  params,
  successCriteria = '',
  minSessions = 10,
  initialCompleted = false,
  initialNotes = '',
  initialStatus = 'not_started',
  initialSessionCount = 0,
  userId,
  onMasteryChange,
}: ExerciseItemProps) {
  const t = useTranslations('magia');
  const [completed, setCompleted] = useState(initialCompleted);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<ExerciseStatus>(initialStatus);
  const [sessionCount, setSessionCount] = useState(initialSessionCount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [masteryOpen, setMasteryOpen] = useState(false);
  const [mirrorOpen, setMirrorOpen] = useState(false);

  const TYPE_LABELS: Partial<Record<ExerciseType, string>> = {
    progressive_timed: t('typeLabelProgressiveTimed'),
    timed: t('typeLabelTimed'),
    habit: t('typeLabelHabit'),
    practice: t('typeLabelPractice'),
    journal: t('typeLabelJournal'),
    instructional: t('typeLabelInstructional'),
    worksheet: t('typeLabelWorksheet'),
  };

  const fullKey = buildExerciseKey(section, fokozatId, exerciseKey);
  const isMastered = status === 'mastered';

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

  const handleSessionSaved = useCallback(() => {
    setSessionCount((c) => c + 1);
    setCompleted(true);
    if (status === 'not_started') setStatus('in_progress');
  }, [status]);

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border border-border/50 bg-card/40 p-5 transition-all duration-300',
          isMastered && 'border-accent/40 bg-accent/5 shadow-glow-gold',
          completed && !isMastered && 'border-accent/15 bg-accent/3'
        )}
      >
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={saving}
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200',
              isMastered
                ? 'border-accent bg-accent text-accent-foreground shadow-glow-gold'
                : completed
                ? 'border-accent/60 bg-accent/20 text-accent'
                : 'border-muted-foreground/30 hover:border-accent/60'
            )}
            aria-label={completed ? t('completed') : t('markDone')}
          >
            {(completed || isMastered) && (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            {/* Cím + típus badge */}
            <div className="flex flex-wrap items-center gap-2">
              <h4
                className={cn(
                  'font-display text-base font-medium text-cream',
                  isMastered && 'text-accent'
                )}
              >
                {title}
              </h4>
              {TYPE_LABELS[type] && (
                <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent/70">
                  {TYPE_LABELS[type]}
                </span>
              )}
              {isMastered && (
                <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent shadow-glow-gold">
                  {t('masteredBadge')}
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>

            {/* Munkamenet-számláló */}
            {sessionCount > 0 && (
              <p className="mt-2 text-[11px] text-accent/60">
                {t('sessionCountDisplay', { count: sessionCount })}
              </p>
            )}

            {/* Indítás + Uraltság gombok */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {type === 'worksheet' ? (
                <button
                  type="button"
                  onClick={() => setMirrorOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/25 hover:shadow-glow-gold"
                >
                  {t('soulMirrorEditorButton')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRunnerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/25 hover:shadow-glow-gold"
                >
                  {t('startButton')}
                </button>
              )}
              {successCriteria && (
                <button
                  type="button"
                  onClick={() => setMasteryOpen(true)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    isMastered
                      ? 'border-accent/40 bg-accent/10 text-accent shadow-glow-gold'
                      : 'border-border/40 text-muted-foreground hover:border-accent/30 hover:text-cream'
                  }`}
                >
                  {isMastered ? t('masteredButton') : t('markMasteredButton')}
                </button>
              )}
            </div>

            {/* Megjegyzés */}
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

      {/* Lelki tükör modal */}
      {mirrorOpen && (
        <MagiaModal onClose={() => setMirrorOpen(false)}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-cream">{title}</h3>
              <button
                type="button"
                onClick={() => setMirrorOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:text-cream"
              >
                ✕
              </button>
            </div>
            <SoulMirrorEditor
              userId={userId}
              showWorkMethods={fokozatId >= 2}
            />
        </MagiaModal>
      )}

      {/* MasteryDialog modal */}
      {masteryOpen && (
        <MasteryDialog
          fokozatId={fokozatId}
          section={section}
          exerciseKey={exerciseKey}
          title={title}
          successCriteria={successCriteria}
          minSessions={minSessions}
          sessionCount={sessionCount}
          currentStatus={status}
          userId={userId}
          onStatusChange={(newStatus) => {
            setStatus(newStatus);
            if (newStatus === 'mastered') setCompleted(true);
            onMasteryChange?.();
          }}
          onClose={() => setMasteryOpen(false)}
        />
      )}

      {/* ExerciseRunner modal */}
      {runnerOpen && (
        <ExerciseRunner
          fokozatId={fokozatId}
          section={section}
          exerciseKey={exerciseKey}
          title={title}
          description={description}
          type={type}
          params={params}
          sessionCount={sessionCount}
          userId={userId}
          onClose={() => setRunnerOpen(false)}
          onSessionSaved={handleSessionSaved}
        />
      )}
    </>
  );
}

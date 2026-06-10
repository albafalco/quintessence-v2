'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { buildExerciseKey } from '@/lib/magia-utils';
import { MagiaModal } from './MagiaModal';
import type { MagiaSection, ExerciseStatus } from '@/lib/magia-types';

interface MasteryDialogProps {
  fokozatId: number;
  section: MagiaSection;
  exerciseKey: string;
  title: string;
  successCriteria: string;
  minSessions: number;
  sessionCount: number;
  currentStatus: ExerciseStatus;
  userId: string;
  onStatusChange: (newStatus: ExerciseStatus) => void;
  onClose: () => void;
}

export function MasteryDialog({
  fokozatId,
  section,
  exerciseKey,
  title,
  successCriteria,
  minSessions,
  sessionCount,
  currentStatus,
  userId,
  onStatusChange,
  onClose,
}: MasteryDialogProps) {
  const t = useTranslations('magia');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullKey = buildExerciseKey(section, fokozatId, exerciseKey);
  const isAlreadyMastered = currentStatus === 'mastered';
  const meetsMinSessions = sessionCount >= minSessions;

  const setStatus = async (newStatus: ExerciseStatus) => {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: dbError } = await supabase.from('magia_progress').upsert(
      {
        user_id: userId,
        fokozat: fokozatId,
        section,
        exercise_key: fullKey,
        completed: newStatus === 'mastered',
        completed_at: newStatus === 'mastered' ? new Date().toISOString() : null,
        status: newStatus,
        mastered_at: newStatus === 'mastered' ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,fokozat,section,exercise_key' }
    );

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
    } else {
      onStatusChange(newStatus);
      onClose();
    }
  };

  return (
    <MagiaModal onClose={onClose} className="max-w-md">
        {/* Fejléc */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/60">
              {t('masteryDialogTitle')}
            </p>
            <h3 className="font-display text-lg font-semibold text-cream">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:text-cream"
          >
            ✕
          </button>
        </div>

        {/* Sikerkritérium */}
        <div className="mb-5 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-accent/60">
            {t('masteryDialogCriteria')}
          </p>
          <p className="text-sm leading-relaxed text-cream/90">{successCriteria}</p>
        </div>

        {/* Munkamenet-feltétel */}
        <div className={`mb-5 flex items-center gap-3 rounded-xl border p-3 ${
          meetsMinSessions
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-amber-500/20 bg-amber-500/5'
        }`}>
          <span className="text-xl">{meetsMinSessions ? '✓' : '⚠'}</span>
          <div>
            <p className="text-xs font-semibold text-cream">
              {t('masteryDialogSessions', { count: sessionCount, min: minSessions })}
            </p>
            {!meetsMinSessions && (
              <p className="text-[11px] text-amber-400/80">
                {t('masteryDialogMinHint', { min: minSessions })}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        {/* Gombok */}
        {isAlreadyMastered ? (
          <div className="space-y-2">
            <p className="mb-3 text-sm text-muted-foreground text-center">
              {t('masteryDialogAlreadyMastered')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('in_progress')}
                disabled={saving}
                className="flex-1 rounded-xl border border-border/40 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-red-400/40 hover:text-red-400 disabled:opacity-50"
              >
                {saving ? t('saving') : t('masteryDialogRevoke')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-xl bg-accent/20 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus('mastered')}
              disabled={saving}
              className="flex-1 rounded-xl bg-accent/20 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold disabled:opacity-50"
            >
              {saving ? t('saving') : t('masteryDialogConfirm')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border/40 px-4 py-3 text-sm text-muted-foreground transition hover:text-cream"
            >
              {t('cancel')}
            </button>
          </div>
        )}
    </MagiaModal>
  );
}

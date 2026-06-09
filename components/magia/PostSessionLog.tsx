'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface PostSessionLogProps {
  durationSec: number;
  onSave: (data: {
    rating: number | null;
    disturbances: string;
    note: string;
  }) => Promise<void>;
  onSkip: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} perc ${s > 0 ? `${s} mp` : ''}`.trim() : `${s} mp`;
}

export function PostSessionLog({ durationSec, onSave, onSkip }: PostSessionLogProps) {
  const t = useTranslations('magia');
  const [rating, setRating] = useState<number | null>(null);
  const [disturbances, setDisturbances] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const RATING_LABELS = ['', t('logRating1'), t('logRating2'), t('logRating3'), t('logRating4'), t('logRating5')];

  const handleSave = async () => {
    setSaving(true);
    await onSave({ rating, disturbances, note });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-center">
        <p className="text-xs uppercase tracking-wider text-accent/70">{t('logDuration')}</p>
        <p className="mt-1 font-display text-2xl font-bold text-cream">{formatDuration(durationSec)}</p>
      </div>

      {/* Értékelés */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent/60">
          {t('logHowWell')}
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 transition-all ${
                rating === n
                  ? 'border-accent bg-accent/20 text-accent shadow-glow-gold'
                  : 'border-border/40 bg-card/20 text-muted-foreground hover:border-accent/30 hover:text-cream'
              }`}
            >
              <span className="text-lg font-bold">{n}</span>
              <span className="hidden text-[9px] uppercase tracking-wide sm:block">{RATING_LABELS[n]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zavaró tényezők */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-accent/60">
          {t('logDisturbances')} <span className="text-muted-foreground/60 normal-case">{t('optional')}</span>
        </label>
        <input
          type="text"
          value={disturbances}
          onChange={(e) => setDisturbances(e.target.value)}
          placeholder={t('logDisturbancesPlaceholder')}
          className="w-full rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/50 focus:outline-none"
        />
      </div>

      {/* Napló */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-accent/60">
          {t('logNote')} <span className="text-muted-foreground/60 normal-case">{t('optional')}</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={t('logNotePlaceholder')}
          className="w-full rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/50 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-accent/20 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold disabled:opacity-50"
        >
          {saving ? t('saving') : t('save')}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="rounded-xl border border-border/40 px-4 py-3 text-sm text-muted-foreground transition hover:text-cream"
        >
          {t('logSkip')}
        </button>
      </div>
    </div>
  );
}

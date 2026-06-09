'use client';

import { useCallback, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TTSButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function TTSButton({ text, className, size = 'md' }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [text]);

  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak();
      }}
      aria-label="Hallgatás"
      title="Hallgatás"
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all',
        'border border-slate-500/30 bg-slate-700/40 text-slate-200 hover:bg-slate-600/50 hover:shadow-card',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        speaking && 'animate-pulse',
        className
      )}
    >
      {speaking ? <VolumeX size={iconSize} /> : <Volume2 size={iconSize} />}
    </button>
  );
}
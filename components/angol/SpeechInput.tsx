'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeechInputProps {
  onResult: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SpeechInput({ onResult, className, disabled }: SpeechInputProps) {
  const t = useTranslations('angol');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) onResultRef.current(transcript.trim());
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      try {
        recognition.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }, [listening]);

  if (!supported) {
    return (
      <span className="text-xs text-muted-foreground">
        {t('speechNotSupported')}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? t('stopDictation') : t('dictate')}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        listening
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-muted text-foreground hover:bg-muted/80',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {listening ? <MicOff size={18} /> : <Mic size={18} />}
      {listening ? t('stopDictation') : t('dictate')}
    </button>
  );
}
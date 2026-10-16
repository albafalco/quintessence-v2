/** English text-to-speech helpers (Web Speech API). */

export const TTS_RATE_NORMAL = 0.9;
export const TTS_RATE_SLOW = 0.6;

/** Text to read out: first sentence of an answer, or first alternative of a vocabulary entry. */
export function speakableEnglish(answer: string, kind: 'sentence' | 'word'): string {
  if (kind === 'word') return answer.split(',')[0].replace(/\([^)]*\)/g, '').trim();
  return answer.split(/(?<=[.!?])\s+/)[0].trim();
}

/** Speaks English text; call from a user gesture the first time (iOS). */
export function speakEnglish(text: string, rate = TTS_RATE_NORMAL, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

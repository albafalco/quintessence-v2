'use client';

/**
 * Sounds of the closed-eye practices, synthesised with Web Audio (no files):
 * the gong that starts and ends a practice, and the soft tick of the breath counter.
 * iOS plays sound only from an AudioContext resumed inside a tap, so call
 * `unlock()` from the button that starts the practice.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function unlock(): void {
  void audio()?.resume().catch(() => {});
}

export interface ScheduledSound {
  osc: OscillatorNode;
  at: number;
}

/** The gong, now or `inSec` seconds later on the audio clock (sounds even while rendering is paused). */
export function gong(inSec = 0, volume = 0.4): ScheduledSound | null {
  const c = audio();
  if (!c) return null;
  const at = c.currentTime + Math.max(0, inSec);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(432, at);
  osc.frequency.exponentialRampToValueAtTime(216, at + 2);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 3);
  osc.start(at);
  osc.stop(at + 3);
  return { osc, at };
}

export function cancel(sound: ScheduledSound | null): void {
  if (!sound) return;
  try {
    sound.osc.stop();
    sound.osc.disconnect();
  } catch {
    // already stopped
  }
}

/** Has a scheduled sound already started playing? */
export function hasPlayed(sound: ScheduledSound | null): boolean {
  const c = ctx;
  return Boolean(sound && c && c.state === 'running' && c.currentTime >= sound.at - 0.25);
}

/** A short, quiet tick for each counted breath. */
export function tick(): void {
  const c = audio();
  if (!c) return;
  const at = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660, at);
  gain.gain.setValueAtTime(0.08, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.08);
  osc.start(at);
  osc.stop(at + 0.1);
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported (iPhone)
  }
}

/** Keeps the screen on during a practice; the browser drops it when the page is hidden. */
export async function keepAwake(): Promise<WakeLockSentinel | null> {
  try {
    if ('wakeLock' in navigator) return await navigator.wakeLock.request('screen');
  } catch {
    // not available: not critical
  }
  return null;
}

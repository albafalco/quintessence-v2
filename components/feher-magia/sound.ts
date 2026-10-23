'use client';

/**
 * Sounds of the closed-eye practices, synthesised with Web Audio (no files):
 * the gong that ends a practice (one singing-bowl-like strike), and the soft tick of the breath counter.
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
  nodes: OscillatorNode[];
  at: number;
}

/** Partials of a singing bowl (ratio to the fundamental, loudness, ring time in seconds) */
const BOWL: [number, number, number][] = [
  [1, 1, 9],
  [2.71, 0.45, 6],
  [5.15, 0.2, 3.5],
  [8.37, 0.08, 2],
];
const BOWL_HZ = 196;

/** One strike of the singing bowl at `at` (audio clock); each partial is doubled, slightly detuned, for the slow beating. */
function strike(c: AudioContext, at: number, volume: number): OscillatorNode[] {
  const nodes: OscillatorNode[] = [];
  for (const [ratio, loud, ring] of BOWL) {
    for (const detune of [1, 1.003]) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(BOWL_HZ * ratio * detune, at);
      // A soft mallet: a short rise, then the long ring
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime((volume * loud) / 2, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
      osc.start(at);
      osc.stop(at + ring + 0.1);
      nodes.push(osc);
    }
  }
  return nodes;
}

/** The end of a practice, now or `inSec` seconds later on the audio clock (it sounds even while rendering is paused): one strike. */
export function endSound(inSec = 0): ScheduledSound | null {
  const c = audio();
  if (!c) return null;
  const at = c.currentTime + Math.max(0, inSec);
  return { nodes: strike(c, at, 0.45), at };
}

export function cancel(sound: ScheduledSound | null): void {
  if (!sound) return;
  for (const osc of sound.nodes) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
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

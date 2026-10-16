export interface PushRun {
  start_time: string;
  end_time: string | null;
  status: string;
  return_message: string | null;
}

export interface PushResponse {
  created: string;
  status_code: number | null;
  timed_out: boolean | null;
  error_msg: string | null;
  content: string | null;
  /** Parsed from content when it is the /api/push/send JSON */
  sent?: number;
  checked?: number;
  staleRemoved?: number;
}

export type PushHealth = 'ok' | 'late' | 'error';

/** Cron runs every 5 minutes: fresh within 10 min, late within 30 min. */
const OK_WINDOW_MS = 10 * 60_000;
const LATE_WINDOW_MS = 30 * 60_000;

export function parsePushResponses(raw: PushResponse[]): PushResponse[] {
  return raw.map((r) => {
    try {
      const json = r.content ? JSON.parse(r.content) : null;
      if (json && typeof json === 'object' && 'checked' in json) {
        return { ...r, sent: Number(json.sent ?? 0), checked: Number(json.checked ?? 0), staleRemoved: Number(json.staleRemoved ?? 0) };
      }
    } catch {
      // not JSON (e.g. an error page)
    }
    return r;
  });
}

export function pushHealth(responses: PushResponse[], now = Date.now()): { health: PushHealth; lastOk: string | null } {
  const lastOk = responses.find((r) => r.status_code === 200)?.created ?? null;
  if (!lastOk) return { health: 'error', lastOk: null };
  const age = now - new Date(lastOk).getTime();
  // The most recent response failing means something broke even if an older one was fine
  if (responses[0]?.status_code !== 200) return { health: 'error', lastOk };
  return { health: age <= OK_WINDOW_MS ? 'ok' : age <= LATE_WINDOW_MS ? 'late' : 'error', lastOk };
}

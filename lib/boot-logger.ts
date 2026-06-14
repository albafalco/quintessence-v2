type BootDetail = Record<string, unknown> | string | number | boolean | null | undefined;

declare global {
  interface Window {
    __qsBootLog?: Array<{ t: number; milestone: string; detail?: BootDetail }>;
  }
}

export function bootLog(milestone: string, detail?: BootDetail) {
  const entry = { t: Date.now(), milestone, detail };
  if (typeof window !== 'undefined') {
    window.__qsBootLog = window.__qsBootLog ?? [];
    window.__qsBootLog.push(entry);
  }
  if (detail !== undefined) {
    console.log(`[boot] ${milestone}`, detail);
  } else {
    console.log(`[boot] ${milestone}`);
  }
}
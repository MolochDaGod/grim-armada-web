/**
 * Frame helpers — keep R3F useFrame loops resilient.
 * One uncaught throw in a useFrame callback can stall/black the whole canvas.
 */

/** Clamp frame delta (seconds) to avoid spiral-of-death after tab focus. */
export function clampDt(dt: number, max = 0.05): number {
  if (!Number.isFinite(dt) || dt < 0) return 0;
  return dt > max ? max : dt;
}

/**
 * Run frame work safely. Logs once per unique message (rate-limited spam).
 * Use for critical systems (engine tick, day/night) so a single bug
 * does not black-screen the game.
 */
const _logged = new Map<string, number>();
const LOG_COOLDOWN_MS = 5000;

export function safeFrameTick(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const key = `${label}:${msg}`;
    const now = Date.now();
    const last = _logged.get(key) ?? 0;
    if (now - last > LOG_COOLDOWN_MS) {
      _logged.set(key, now);
      console.warn(`[safeFrame] ${label}:`, err);
    }
  }
}

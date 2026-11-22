import type { UseTankResult } from '#src/tank/useTank.ts';

/**
 * Writes the time until a tank is ready, such as "Ready in 3:42", or "Ready". Returns an empty string while the tank
 * is loading or in error. The seconds round up, so the text never reads "0:00" while the tank recharges.
 */
export function formatCountdown(tank: Pick<UseTankResult, 'status' | 'msUntilReady'>): string {
  switch (tank.status) {
    case 'loading':
    case 'error':
      return '';
    case 'ready':
      return 'Ready';
    case 'recharging':
      if (tank.msUntilReady === undefined) {
        return '';
      }
      if (!Number.isFinite(tank.msUntilReady)) {
        return 'Not refilling';
      }
      return `Ready in ${formatClock(Math.max(1, Math.ceil(tank.msUntilReady / 1000)))}`;
  }
}

// region | Helpers
/** Writes a duration as `m:ss`, or as `h:mm:ss` from one hour. */
function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
// endregion | Helpers

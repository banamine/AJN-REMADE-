/**
 * BroadcastClock Singleton Service
 * Unified UTC and local time engine for broadcast timing, timezone conversion,
 * and authoritative LIVE calculation (`startUtc <= now < endUtc`).
 */

export class BroadcastClock {
  private static instance: BroadcastClock;
  private timeOffsetMs: number = 0; // Optional sync offset if server time differs

  private constructor() {}

  public static getInstance(): BroadcastClock {
    if (!BroadcastClock.instance) {
      BroadcastClock.instance = new BroadcastClock();
    }
    return BroadcastClock.instance;
  }

  /**
   * Get current authoritative UTC timestamp in milliseconds.
   */
  public nowMs(): number {
    return Date.now() + this.timeOffsetMs;
  }

  /**
   * Get current authoritative UTC ISO string.
   */
  public nowUtc(): string {
    return new Date(this.nowMs()).toISOString();
  }

  /**
   * Get current Date object adjusted to broadcast clock.
   */
  public nowDate(): Date {
    return new Date(this.nowMs());
  }

  /**
   * Format UTC ISO timestamp into local broadcast time string (e.g. "04:30 PM").
   */
  public formatTime(utcIsoString: string, timeZone: string = 'UTC'): string {
    try {
      const date = new Date(utcIsoString);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timeZone === 'UTC' ? undefined : timeZone,
      });
    } catch {
      return utcIsoString;
    }
  }

  /**
   * Determine if a program is currently LIVE based on BroadcastClock time.
   * Condition: startUtc <= now < endUtc
   */
  public isLive(startUtc: string, endUtc: string): boolean {
    const now = this.nowMs();
    const start = new Date(startUtc).getTime();
    const end = new Date(endUtc).getTime();
    return now >= start && now < end;
  }

  /**
   * Determine if a program is in the future.
   */
  public isUpcoming(startUtc: string): boolean {
    const now = this.nowMs();
    const start = new Date(startUtc).getTime();
    return now < start;
  }

  /**
   * Determine if a program has already ended.
   */
  public isPast(endUtc: string): boolean {
    const now = this.nowMs();
    const end = new Date(endUtc).getTime();
    return now >= end;
  }
}

export const broadcastClock = BroadcastClock.getInstance();

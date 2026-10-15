/**
 * Time utility functions for Play It audio & video players
 */

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number, forceHours = false): string {
  if (!seconds || !Number.isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  if (!Number.isFinite(total) || total < 0) return '0:00';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);

  if (h > 0 || forceHours) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse a user-entered time string into absolute seconds.
 * Supports:
 * - "mm:ss" (e.g. "1:30" -> 90s, "04:15" -> 255s)
 * - "hh:mm:ss" (e.g. "1:15:20" -> 4520s)
 * - plain seconds (e.g. "85" -> 85s)
 * - relative offset (e.g. "+15" -> current + 15s, "-10" -> current - 10s)
 * - unit suffix (e.g. "2m" -> 120s, "45s" -> 45s, "1.5m" -> 90s)
 */
export function parseTimeToSeconds(input: string, currentTime = 0, maxDuration = 0): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const safeCurrent = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  const safeMax = Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : Number.MAX_SAFE_INTEGER;

  // Relative offset: "+30", "-15", "+1:30"
  if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
    const isNegative = trimmed.startsWith('-');
    const rest = trimmed.slice(1).trim();
    const parsedRest = parseTimeToSeconds(rest, 0, safeMax);
    if (parsedRest === null) return null;
    const target = isNegative ? safeCurrent - parsedRest : safeCurrent + parsedRest;
    return Math.max(0, Math.min(safeMax, target));
  }

  // Unit suffix: "2m", "90s", "1h"
  const unitMatch = trimmed.match(/^([\d.]+)\s*(s|sec|m|min|h|hr)$/i);
  if (unitMatch) {
    const val = parseFloat(unitMatch[1]);
    const unit = unitMatch[2].toLowerCase();
    if (isNaN(val)) return null;
    let target = val;
    if (unit.startsWith('m')) target = val * 60;
    else if (unit.startsWith('h')) target = val * 3600;
    return Math.max(0, Math.min(safeMax, target));
  }

  // Colon separated: "mm:ss" or "hh:mm:ss"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));
    if (parts.some((p) => isNaN(p))) return null;

    let target = 0;
    if (parts.length === 2) {
      // mm:ss
      target = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // hh:mm:ss
      target = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      return null;
    }
    return Math.max(0, Math.min(safeMax, target));
  }

  // Pure number of seconds
  const numeric = parseFloat(trimmed);
  if (!isNaN(numeric) && numeric >= 0) {
    return Math.max(0, Math.min(safeMax, numeric));
  }

  return null;
}

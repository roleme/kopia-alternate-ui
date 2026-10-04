const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MILLISECOND_CUTOFF = 10 * MS_PER_SECOND;

export default function formatDuration(totalMs: number) {
  const ms = Math.max(0, Math.round(totalMs));
  const showMs = ms <= MILLISECOND_CUTOFF;

  const hours = Math.floor(ms / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
  const millis = ms % MS_PER_SECOND;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (showMs && millis > 0) parts.push(`${millis}ms`);

  return parts.length > 0 ? parts.join(" ") : "0s";
}

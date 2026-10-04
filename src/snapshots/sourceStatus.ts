import type { SourceStatus } from "../core/types";

export type SourceStatusView =
  | { kind: "running"; percent?: number; doneBytes?: number; totalBytes?: number }
  | { kind: "queued" }
  | { kind: "errors"; count: number }
  | { kind: "paused" }
  | { kind: "manual" }
  | { kind: "overdue"; dueAt: string }
  | { kind: "due"; dueAt: string }
  | { kind: "scheduled"; at: string }
  | { kind: "firstRun"; at: string }
  | { kind: "none" };

const DAY_SECONDS = 24 * 60 * 60;

export function scheduleIntervalSeconds(schedule: SourceStatus["schedule"] | undefined): number {
  const interval = schedule?.intervalSeconds;
  return interval !== undefined && interval > 0 ? interval : DAY_SECONDS;
}

export function sourceErrorCount(source: SourceStatus): number {
  const fromStats = source.lastSnapshot?.stats?.errorCount ?? 0;
  if (fromStats > 0) return fromStats;
  return source.lastSnapshot?.rootEntry?.summ?.numFailed ?? 0;
}

function runningView(source: SourceStatus): SourceStatusView {
  const upload = source.upload;
  if (!upload?.estimatedBytes || upload.estimatedBytes <= 0) return { kind: "running" };
  const doneBytes = (upload.hashedBytes ?? 0) + (upload.cachedBytes ?? 0);
  const percent = Math.min(100, Math.max(0, Math.round((doneBytes * 100) / upload.estimatedBytes)));
  return { kind: "running", percent, doneBytes, totalBytes: upload.estimatedBytes };
}

export function getSourceStatusView(source: SourceStatus, now: Date | number = Date.now()): SourceStatusView {
  switch (source.status) {
    case "UPLOADING":
      return runningView(source);
    case "PENDING":
      return { kind: "queued" };
    case "IDLE":
    case "PAUSED":
    case "REMOTE":
      break;
    default:
      return { kind: "none" };
  }

  const errors = sourceErrorCount(source);
  if (errors > 0) return { kind: "errors", count: errors };
  if (source.status === "PAUSED") return { kind: "paused" };
  if (source.status === "REMOTE") return { kind: "none" };
  if (source.schedule?.manual) return { kind: "manual" };

  const next = source.nextSnapshotTime;
  if (!next) return { kind: "none" };
  const nextMs = new Date(next).getTime();
  if (Number.isNaN(nextMs)) return { kind: "none" };

  const nowMs = typeof now === "number" ? now : now.getTime();
  const lateMs = nowMs - nextMs;
  if (lateMs > scheduleIntervalSeconds(source.schedule) * 1000) return { kind: "overdue", dueAt: next };
  if (lateMs > 0) return { kind: "due", dueAt: next };
  return source.lastSnapshot ? { kind: "scheduled", at: next } : { kind: "firstRun", at: next };
}

import { describe, expect, it } from "vitest";
import type { SourceStatus } from "../../src/core/types";
import { getSourceStatusView, scheduleIntervalSeconds, sourceErrorCount } from "../../src/snapshots/sourceStatus";

const NOW = new Date("2026-10-04T12:00:00Z").getTime();
const HOUR = 3600 * 1000;
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

const lastSnapshot = (errorCount = 0, numFailed = 0): SourceStatus["lastSnapshot"] => ({
  id: "s1",
  source: { host: "h", userName: "u", path: "/p" },
  description: "",
  startTime: iso(-HOUR),
  endTime: iso(-HOUR),
  stats: {
    totalSize: 1,
    excludedTotalSize: 0,
    fileCount: 1,
    cachedFiles: 0,
    nonCachedFiles: 0,
    dirCount: 0,
    excludedFileCount: 0,
    excludedDirCount: 0,
    ignoredErrorCount: 0,
    errorCount
  },
  rootEntry: {
    name: "p",
    type: "d",
    mode: "0755",
    mtime: iso(-HOUR),
    obj: "k1",
    summ: { size: 1, files: 1, symlinks: 0, dirs: 0, maxTime: iso(-HOUR), numFailed }
  }
});

const make = (overrides: Partial<SourceStatus> = {}): SourceStatus => ({
  source: { host: "h", userName: "u", path: "/p" },
  status: "IDLE",
  schedule: { intervalSeconds: 3 * 3600 },
  lastSnapshot: lastSnapshot(),
  nextSnapshotTime: iso(2 * HOUR),
  ...overrides
});

const upload = (hashed: number, cached: number, estimated: number): SourceStatus["upload"] => ({
  cachedBytes: cached,
  hashedBytes: hashed,
  uploadedBytes: 0,
  estimatedBytes: estimated,
  cachedFiles: 0,
  hashedFiles: 0,
  excludedFiles: 0,
  excludedDirs: 0,
  errors: 0,
  ignoredErrors: 0,
  estimatedFiles: 0,
  directory: "",
  lastErrorPath: "",
  lastError: ""
});

describe("getSourceStatusView", () => {
  it("shows percent and byte counts for a running source", () => {
    const view = getSourceStatusView(make({ status: "UPLOADING", upload: upload(200, 680, 1000) }), NOW);
    expect(view).toEqual({ kind: "running", percent: 88, doneBytes: 880, totalBytes: 1000 });
  });

  it("falls back to plain running without upload counters", () => {
    expect(getSourceStatusView(make({ status: "UPLOADING" }), NOW)).toEqual({ kind: "running" });
  });

  it("falls back to plain running when the estimate is zero", () => {
    expect(getSourceStatusView(make({ status: "UPLOADING", upload: upload(10, 0, 0) }), NOW)).toEqual({
      kind: "running"
    });
  });

  it("caps the running percent at 100", () => {
    const view = getSourceStatusView(make({ status: "UPLOADING", upload: upload(2000, 0, 1000) }), NOW);
    expect(view).toMatchObject({ kind: "running", percent: 100 });
  });

  it("reports pending sources as queued", () => {
    expect(getSourceStatusView(make({ status: "PENDING", nextSnapshotTime: iso(-20000) }), NOW)).toEqual({
      kind: "queued"
    });
  });

  it("reports paused sources", () => {
    expect(getSourceStatusView(make({ status: "PAUSED", nextSnapshotTime: undefined }), NOW)).toEqual({
      kind: "paused"
    });
  });

  it("reports manual sources", () => {
    expect(getSourceStatusView(make({ schedule: { manual: true }, nextSnapshotTime: undefined }), NOW)).toEqual({
      kind: "manual"
    });
  });

  it("reports the error count from the last snapshot stats", () => {
    expect(getSourceStatusView(make({ lastSnapshot: lastSnapshot(3) }), NOW)).toEqual({ kind: "errors", count: 3 });
  });

  it("falls back to the root entry failed count", () => {
    expect(getSourceStatusView(make({ lastSnapshot: lastSnapshot(0, 2) }), NOW)).toEqual({
      kind: "errors",
      count: 2
    });
  });

  it("prefers errors over a schedule label on idle sources", () => {
    expect(
      getSourceStatusView(make({ lastSnapshot: lastSnapshot(1), nextSnapshotTime: iso(-100 * HOUR) }), NOW)
    ).toEqual({ kind: "errors", count: 1 });
  });

  it("does not report errors while running or queued", () => {
    expect(getSourceStatusView(make({ status: "UPLOADING", lastSnapshot: lastSnapshot(3) }), NOW).kind).toBe("running");
    expect(getSourceStatusView(make({ status: "PENDING", lastSnapshot: lastSnapshot(3) }), NOW).kind).toBe("queued");
  });

  it("shows healthy sources as scheduled", () => {
    const at = iso(2 * HOUR);
    expect(getSourceStatusView(make({ nextSnapshotTime: at }), NOW)).toEqual({ kind: "scheduled", at });
  });

  it("shows never-snapshotted sources as first run", () => {
    const at = iso(16 * HOUR);
    expect(
      getSourceStatusView(
        make({ lastSnapshot: undefined, schedule: { cron: ["30 3 * * *"] }, nextSnapshotTime: at }),
        NOW
      )
    ).toEqual({ kind: "firstRun", at });
  });

  it("shows no status for a never-snapshotted source with no next time", () => {
    expect(getSourceStatusView(make({ lastSnapshot: undefined, nextSnapshotTime: undefined }), NOW)).toEqual({
      kind: "none"
    });
  });

  it("shows a slightly late source as due, not overdue", () => {
    const at = iso(-HOUR);
    expect(getSourceStatusView(make({ nextSnapshotTime: at }), NOW)).toEqual({ kind: "due", dueAt: at });
  });

  it("is not overdue exactly one interval late", () => {
    expect(getSourceStatusView(make({ nextSnapshotTime: iso(-3 * HOUR) }), NOW).kind).toBe("due");
  });

  it("is overdue when more than one interval late", () => {
    const at = iso(-3 * HOUR - 1000);
    expect(getSourceStatusView(make({ nextSnapshotTime: at }), NOW)).toEqual({ kind: "overdue", dueAt: at });
  });

  it("uses 24 hours as the interval for cron schedules", () => {
    const schedule = { cron: ["0 3 * * *"] };
    expect(getSourceStatusView(make({ schedule, nextSnapshotTime: iso(-23 * HOUR) }), NOW).kind).toBe("due");
    expect(getSourceStatusView(make({ schedule, nextSnapshotTime: iso(-25 * HOUR) }), NOW).kind).toBe("overdue");
  });

  it("uses 24 hours as the interval for time-of-day schedules", () => {
    const schedule = { timeOfDay: [{ hour: 3, min: 30 }] };
    expect(getSourceStatusView(make({ schedule, nextSnapshotTime: iso(-23 * HOUR) }), NOW).kind).toBe("due");
    expect(getSourceStatusView(make({ schedule, nextSnapshotTime: iso(-25 * HOUR) }), NOW).kind).toBe("overdue");
  });

  it("can flag a never-snapshotted scheduled source as overdue", () => {
    expect(getSourceStatusView(make({ lastSnapshot: undefined, nextSnapshotTime: iso(-10 * HOUR) }), NOW).kind).toBe(
      "overdue"
    );
  });

  it("never reports overdue for running, queued, paused, manual or remote sources", () => {
    const stale = iso(-1000 * HOUR);
    expect(getSourceStatusView(make({ status: "UPLOADING", nextSnapshotTime: stale }), NOW).kind).toBe("running");
    expect(getSourceStatusView(make({ status: "PENDING", nextSnapshotTime: stale }), NOW).kind).toBe("queued");
    expect(getSourceStatusView(make({ status: "PAUSED", nextSnapshotTime: stale }), NOW).kind).toBe("paused");
    expect(getSourceStatusView(make({ schedule: { manual: true }, nextSnapshotTime: stale }), NOW).kind).toBe("manual");
    expect(getSourceStatusView(make({ status: "REMOTE", schedule: {}, nextSnapshotTime: stale }), NOW).kind).toBe(
      "none"
    );
  });

  it("shows no status for remote sources without errors", () => {
    expect(getSourceStatusView(make({ status: "REMOTE", schedule: {}, nextSnapshotTime: undefined }), NOW)).toEqual({
      kind: "none"
    });
  });

  it("shows no status for unknown states", () => {
    expect(getSourceStatusView(make({ status: "UNKNOWN" }), NOW)).toEqual({ kind: "none" });
  });

  it("shows no status for an idle source without a next time", () => {
    expect(getSourceStatusView(make({ nextSnapshotTime: undefined }), NOW)).toEqual({ kind: "none" });
  });

  it("shows no status for an unparseable next time", () => {
    expect(getSourceStatusView(make({ nextSnapshotTime: "garbage" }), NOW)).toEqual({ kind: "none" });
  });

  it("accepts a Date as now", () => {
    expect(getSourceStatusView(make({ nextSnapshotTime: iso(HOUR) }), new Date(NOW)).kind).toBe("scheduled");
  });
});

describe("scheduleIntervalSeconds", () => {
  it("uses the interval when set", () => {
    expect(scheduleIntervalSeconds({ intervalSeconds: 600 })).toBe(600);
  });
  it("defaults to 24 hours", () => {
    expect(scheduleIntervalSeconds({ cron: ["* * * * *"] })).toBe(86400);
    expect(scheduleIntervalSeconds({ intervalSeconds: 0 })).toBe(86400);
    expect(scheduleIntervalSeconds(undefined)).toBe(86400);
  });
});

describe("sourceErrorCount", () => {
  it("is zero without a snapshot", () => {
    expect(sourceErrorCount(make({ lastSnapshot: undefined }))).toBe(0);
  });
  it("prefers the stats error count", () => {
    expect(sourceErrorCount(make({ lastSnapshot: lastSnapshot(4, 9) }))).toBe(4);
  });
});

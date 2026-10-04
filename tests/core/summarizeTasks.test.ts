import { describe, expect, it } from "vitest";
import { RECENT_FAILURE_WINDOW_MS, summarizeTasks } from "../../src/core/TaskCounts/summarizeTasks";

const now = Date.parse("2026-10-04T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const hour = 60 * 60 * 1000;

describe("summarizeTasks", () => {
  it("returns zeros for no tasks", () => {
    expect(summarizeTasks([], now)).toEqual({ success: 0, failed: 0, running: 0 });
  });

  it("counts each status", () => {
    const tasks = [
      { status: "SUCCESS", startTime: ago(5 * hour), endTime: ago(4 * hour) },
      { status: "SUCCESS", startTime: ago(3 * hour), endTime: ago(2 * hour) },
      { status: "RUNNING", startTime: ago(hour) },
      { status: "CANCELED", startTime: ago(hour), endTime: ago(hour / 2) }
    ];
    expect(summarizeTasks(tasks, now)).toEqual({ success: 2, failed: 0, running: 1 });
  });

  it("counts only failures from the last 24 hours", () => {
    const tasks = [
      { status: "FAILED", startTime: ago(13 * hour), endTime: ago(12.9 * hour) },
      { status: "FAILED", startTime: ago(49 * hour), endTime: ago(48.9 * hour) },
      { status: "FAILED", startTime: ago(25 * hour), endTime: ago(RECENT_FAILURE_WINDOW_MS + hour) }
    ];
    expect(summarizeTasks(tasks, now).failed).toBe(1);
  });

  it("falls back to the start time when a failed task has no end time", () => {
    expect(summarizeTasks([{ status: "FAILED", startTime: ago(2 * hour) }], now).failed).toBe(1);
    expect(summarizeTasks([{ status: "FAILED", startTime: ago(30 * hour) }], now).failed).toBe(0);
  });
});

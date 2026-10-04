import type { Task } from "../types";

export const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type TaskCountsSummary = {
  success: number;
  failed: number;
  running: number;
};

export function summarizeTasks(
  tasks: Pick<Task, "status" | "startTime" | "endTime">[],
  now: number
): TaskCountsSummary {
  const summary: TaskCountsSummary = { success: 0, failed: 0, running: 0 };

  for (const task of tasks) {
    if (task.status === "SUCCESS") {
      summary.success++;
    } else if (task.status === "RUNNING") {
      summary.running++;
    } else if (task.status === "FAILED") {
      const finished = Date.parse(task.endTime ?? task.startTime);
      if (Number.isNaN(finished) || now - finished <= RECENT_FAILURE_WINDOW_MS) {
        summary.failed++;
      }
    }
  }

  return summary;
}

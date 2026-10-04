import { useCallback, useEffect, useState } from "react";
import { useServerInstanceContext } from "../context/ServerInstanceContext";
import useApiRequest from "../hooks/useApiRequest";
import { useInterval } from "../hooks/useInterval";
import type { TaskList } from "../types";
import { summarizeTasks, type TaskCountsSummary } from "./summarizeTasks";

const REFRESH_INTERVAL_MS = 1000 * 60;

export function useTaskCounts() {
  const { kopiaService } = useServerInstanceContext();
  const [counts, setCounts] = useState<TaskCountsSummary>({ success: 0, failed: 0, running: 0 });
  const getTasks = useCallback(() => kopiaService.getTasks(), [kopiaService]);
  const onReturn = useCallback((resp: TaskList) => {
    setCounts(summarizeTasks(resp.tasks ?? [], Date.now()));
  }, []);
  const loadAction = useApiRequest({ action: getTasks, onReturn });
  const { execute } = loadAction;

  useEffect(() => {
    execute();
  }, [execute]);

  useInterval(() => {
    execute();
  }, REFRESH_INTERVAL_MS);

  return counts;
}

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Container, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { IconClockPlay, IconClockStop, IconStopwatch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { ErrorAlert } from "../core/ErrorAlert/ErrorAlert";
import FormattedDate from "../core/FormattedDate";
import useApiRequest from "../core/hooks/useApiRequest";
import { useInterval } from "../core/hooks/useInterval";
import IconWrapper from "../core/IconWrapper";
import { PageHeader } from "../core/PageHeader/PageHeader";
import { PageState } from "../core/PageState/PageState";
import TimeDuration from "../core/TimeDuration";
import type { Task } from "../core/types";
import TaskCounterGrid from "./components/TaskCounterGrid";
import TaskLogs from "./components/TaskLogs";
import TaskSummaryDisplay from "./components/TaskSummaryDisplay";

function TaskDetailsPage() {
  const { kopiaService } = useServerInstanceContext();
  const { tid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Task>();
  const taskApi = useApiRequest({
    action: () => kopiaService.getTask(tid || ""),
    onReturn(resp) {
      setData(resp);
    }
  });

  useInterval(
    () => {
      taskApi.execute(undefined, "refresh");
    },
    data?.status === "RUNNING" ? 1000 : null
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: need-to-fix-later
  useEffect(() => {
    taskApi.execute(undefined, "loading");
  }, []);

  return (
    <Container fluid>
      <Stack>
        <PageHeader title={data ? `${data.kind}: ${data.description}` : t`Task`} onBack={() => navigate(-1)} />
        <ErrorAlert error={taskApi.error} />
        <PageState loading={!data && !taskApi.error}>
          {data && <TaskSummaryDisplay task={data} />}
          <Group grow>
            <Paper withBorder radius="md" p="xs">
              <Group wrap="nowrap">
                <IconWrapper icon={IconClockPlay} size={32} color="green" />
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    <Trans>Started</Trans>
                  </Text>
                  <Text fw={700} size="xl">
                    {data?.startTime ? <FormattedDate value={data.startTime} /> : "-"}
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder radius="md" p="xs">
              <Group wrap="nowrap">
                <IconWrapper icon={IconClockStop} size={32} color="blue" />
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    <Trans>Finished</Trans>
                  </Text>
                  <Text fw={700} size="xl">
                    {data?.endTime ? <FormattedDate value={data.endTime} /> : "-"}
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder radius="md" p="xs">
              <Group>
                <IconWrapper icon={IconStopwatch} size={32} color="teal" />
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    <Trans>Duration</Trans>
                  </Text>
                  <Text fw={700} size="xl">
                    {data?.startTime && (
                      <TimeDuration from={data.startTime} to={data.endTime ?? new Date().toString()} />
                    )}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Group>
          <Divider />
          {data && data.counters != null && <TaskCounterGrid task={data} showZeroCounters={false} />}
          {data && <TaskLogs task={data} />}
        </PageState>
      </Stack>
    </Container>
  );
}

export default TaskDetailsPage;

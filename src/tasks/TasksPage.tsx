import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Anchor, Center, Container, Divider, Group, SegmentedControl, Stack, TextInput } from "@mantine/core";
import { useDebouncedValue, useInputState } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import {
  IconBan,
  IconCircleXFilled,
  IconClick,
  IconList,
  IconLoader,
  IconSearch,
  IconSettingsAutomation
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { confirmAction } from "../core/confirmAction";
import { useAppContext } from "../core/context/AppContext";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { DataGrid } from "../core/DataGrid/DataGrid";
import useApiRequest from "../core/hooks/useApiRequest";
import IconWrapper from "../core/IconWrapper";
import { MenuButton } from "../core/MenuButton/MenuButton";
import { MetaLine } from "../core/MetaLine";
import { PageHeader } from "../core/PageHeader/PageHeader";
import { PageState } from "../core/PageState/PageState";
import RelativeDate from "../core/RelativeDate";
import { ResponsiveCell } from "../core/ResponsiveCell";
import { RowAction } from "../core/RowAction";
import type { Task, TaskList } from "../core/types";
import { onlyUnique } from "../utils/onlyUnique";
import TaskKindDisplay from "./components/TaskKindDisplay";
import TaskStatusDisplay from "./components/TaskStatusDisplay";

type StatusFilter = "all" | "running" | "failed";

function TasksPage() {
  const { kopiaService } = useServerInstanceContext();
  const { pageSize: tablePageSize } = useAppContext();
  const [data, setData] = useState<TaskList>();
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useInputState("");
  const [debouncedQuery] = useDebouncedValue(query, 200);
  const getTasks = useCallback(() => kopiaService.getTasks(), [kopiaService]);
  const loadAction = useApiRequest({
    action: getTasks,
    onReturn: setData
  });

  const cancelTaskAction = useApiRequest({
    showErrorAsNotification: true,
    action: (tid?: string) => kopiaService.cancelTask(tid!),
    onReturn() {
      loadAction.execute(undefined, "refresh");
      showNotification({
        title: t`Canceling task`,
        message: t`The task was asked to stop`,
        color: "green"
      });
    }
  });

  useEffect(() => {
    loadAction.execute(undefined, "loading");
  }, [loadAction.execute]);

  const visibleTasks = useMemo(() => {
    let items = [...(data?.tasks || [])];

    if (kindFilter != "all") {
      items = items.filter((x) => x.kind === kindFilter);
    }

    if (statusFilter != "all") {
      items = items.filter((x) => x.status === statusFilter?.toUpperCase());
    }

    if (debouncedQuery !== "") {
      items = items.filter((x) => x.description.indexOf(debouncedQuery) !== -1);
    }

    return items;
  }, [data, kindFilter, statusFilter, debouncedQuery]);

  const renderActions = (item: Task) =>
    item.status === "RUNNING" && (
      <RowAction
        label={t({
          context: "cancel-operation",
          message: "Cancel Task"
        })}
        icon={IconBan}
        color="red.5"
        loading={cancelTaskAction.loading && cancelTaskAction.loadingKey === item.id}
        onClick={() =>
          confirmAction({
            title: t`Cancel this task?`,
            message: item.description,
            confirmLabel: t`Cancel task`,
            cancelLabel: t`Keep running`,
            onConfirm: () => cancelTaskAction.execute(item.id, item.id)
          })
        }
      />
    );

  const renderMeta = (item: Task) => (
    <MetaLine
      items={[
        { key: "id", content: `#${item.id}` },
        { key: "kind", content: <TaskKindDisplay kind={item.kind} /> },
        { key: "description", content: item.description }
      ]}
    />
  );

  return (
    <Container fluid>
      <Stack>
        <PageHeader
          title={<Trans>Tasks</Trans>}
          onRefresh={() => loadAction.execute(undefined, "refresh")}
          refreshing={loadAction.loading && loadAction.loadingKey === "refresh"}
        />
        <Group justify="space-between" align="flex-end">
          <Group>
            <SegmentedControl
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as StatusFilter)}
              data={[
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconList size={16} />
                      <span>
                        <Trans>All</Trans>
                      </span>
                    </Center>
                  ),
                  value: "all"
                },
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconLoader size={16} color="var(--mantine-color-blue-5)" />
                      <span>
                        <Trans>Running</Trans>
                      </span>
                    </Center>
                  ),
                  value: "running"
                },
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconCircleXFilled color="var(--mantine-color-red-5)" size={16} />
                      <span>
                        <Trans>Failed</Trans>
                      </span>
                    </Center>
                  ),
                  value: "failed"
                }
              ]}
            />
            <MenuButton
              prefix={t`Kind` + ":"}
              options={[
                { label: t`All`, value: "all" },
                { label: "divider", value: "divider" },
                ...(data?.tasks || [])
                  .map((x) => x.kind)
                  .filter(onlyUnique)
                  .map((x) => ({
                    label: <TaskKindDisplay kind={x} />,
                    value: x
                  }))
              ]}
              onClick={setKindFilter}
              disabled={loadAction.loading}
            />
          </Group>
          <Group>
            <TextInput
              size="sm"
              placeholder={t`Search tasks`}
              aria-label={t`Search tasks`}
              leftSection={<IconSearch size={18} />}
              value={query}
              onChange={setQuery}
            />
          </Group>
        </Group>
        <Divider />

        <PageState
          hasData={data !== undefined}
          loading={data === undefined && !loadAction.error}
          error={loadAction.error}
        >
          <DataGrid
            loading={loadAction.loading && loadAction.loadingKey === "loading"}
            records={visibleTasks}
            noRecordsText={t`No tasks found`}
            noRecordsIcon={<IconWrapper icon={IconSettingsAutomation} size={48} />}
            pageSize={tablePageSize}
            columns={[
              {
                accessor: "id",
                title: t`Task ID`,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                width: 75
              },
              {
                accessor: "startTime",
                title: t`Start Time`,
                render: (item) => (
                  <ResponsiveCell
                    hiddenFrom="md"
                    secondary={
                      <Stack gap={6}>
                        <TaskStatusDisplay task={item} />
                        {renderMeta(item)}
                        {renderActions(item)}
                      </Stack>
                    }
                    primary={
                      <Anchor component={Link} to={`/tasks/${item.id}`} td="none">
                        <RelativeDate value={item.startTime} />
                      </Anchor>
                    }
                  />
                )
              },
              {
                accessor: "status",
                title: t`Status`,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: (item) => <TaskStatusDisplay task={item} />
              },
              {
                accessor: "kind",
                title: t`Kind`,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: (item) => <TaskKindDisplay kind={item.kind} />
              },
              {
                accessor: "description",
                title: t`Description`,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`
              },
              {
                accessor: "actions",
                title: <IconClick size={16} />,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                width: "0%",
                textAlign: "right",
                render: renderActions
              }
            ]}
          />
        </PageState>
      </Stack>
    </Container>
  );
}

export default TasksPage;

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Anchor, Badge, Box, Button, Container, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconCircleCheck, IconClick, IconFileDatabase, IconFolderOpen, IconRefreshAlert } from "@tabler/icons-react";
import sortBy from "lodash.sortby";
import type { DataTableSortStatus } from "mantine-datatable";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { newActionProps, refreshButtonProps } from "../core/commonButtons";
import { useAppContext } from "../core/context/AppContext";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { DataGrid } from "../core/DataGrid/DataGrid";
import useApiRequest from "../core/hooks/useApiRequest";
import { useInterval } from "../core/hooks/useInterval";
import IconWrapper from "../core/IconWrapper";
import { MenuButton } from "../core/MenuButton/MenuButton";
import { MetaLine } from "../core/MetaLine";
import { PageState } from "../core/PageState/PageState";
import { RefreshButton } from "../core/RefreshButton";
import RelativeDate from "../core/RelativeDate";
import { ResponsiveCell } from "../core/ResponsiveCell";
import type { SourceInfo, SourceStatus, Sources } from "../core/types";
import { formatOwnerName } from "../utils/formatOwnerName";
import sizeDisplayName from "../utils/formatSize";
import { onlyUnique } from "../utils/onlyUnique";
import SourceRowActions from "./components/SourceRowActions";
import SourceStatusCell, { EmptyCell } from "./components/SourceStatusCell";
import NewSnapshotModal from "./modals/NewSnapshotModal";
import { normalizeRefreshInterval } from "./refreshInterval";
import { sourceHistoryLink } from "./sourceLinks";

function SnapshotsPage() {
  const { kopiaService } = useServerInstanceContext();
  const [show, setShow] = useDisclosure();
  const { pageSize: tablePageSize, bytesStringBase2 } = useAppContext();
  const [data, setData] = useState<Sources>();
  const [filterState, setFilterState] = useState<"all" | "local" | string>("all");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<SourceStatus>>({
    columnAccessor: "source.path",
    direction: "asc"
  });
  const [storedRefreshInterval, setRefreshInterval] = useLocalStorage<number | null>({
    key: "kopia-alt-ui-snapshot-refresh",
    defaultValue: 3000,
    getInitialValueInEffect: false
  });
  const refreshInterval = normalizeRefreshInterval(storedRefreshInterval);

  const activeRefreshInterval = useMemo(() => {
    if (data?.sources !== undefined && data.sources.some((x) => x.status === "PENDING" || x.status === "UPLOADING")) {
      return 3000;
    }
    return refreshInterval;
  }, [refreshInterval, data]);

  const visibleData = useMemo(() => {
    if (data === undefined) return [];

    let filterable = [...data.sources];

    switch (filterState) {
      case "all":
        break;
      case "local":
        filterable = filterable.filter((x) => formatOwnerName(x.source) === data.localUsername + "@" + data.localHost);
        break;
      default:
        filterable = filterable.filter((x) => formatOwnerName(x.source) === filterState);
    }

    const entries = sortBy(filterable, sortStatus.columnAccessor) as SourceStatus[];
    return sortStatus.direction === "desc" ? entries.reverse() : entries;
  }, [data, filterState, sortStatus]);

  const loadAction = useApiRequest({
    action: () => kopiaService.getSnapshots(),
    onReturn: setData
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only load data on mount
  useEffect(() => {
    loadAction.execute(undefined, "loading");
  }, []);

  useInterval(() => {
    loadAction.execute(undefined, "fetch");
  }, activeRefreshInterval);

  const uniqueOwners = (data?.sources || [])
    .map((x) => formatOwnerName(x.source))
    .filter(onlyUnique)
    .sort();

  const newSnapshotActions = useApiRequest({
    action: (data?: SourceInfo) => kopiaService.startSnapshot(data!),
    onReturn() {
      loadAction.execute(undefined, "refresh");
    }
  });
  const syncAction = useApiRequest({
    action: () => kopiaService.syncRepo(),
    showErrorAsNotification: true,
    onReturn() {
      loadAction.execute(undefined, "refresh");
      showNotification({
        title: t`Repository synchronized`,
        message: t`The repository was synchronized successfully`,
        color: "green",
        icon: <IconCircleCheck size={16} />
      });
    }
  });
  const intError = loadAction.error || newSnapshotActions.error;

  const renderOwner = (item: SourceStatus) =>
    item.status === "REMOTE" ? (
      <Group gap="xs" align="center" wrap="nowrap">
        <Text fz="sm">{`${item.source.userName}@${item.source.host}`}</Text>
        <Badge size="sm" radius={5} tt="none" variant="light" color="grape">
          <Trans>Remote</Trans>
        </Badge>
      </Group>
    ) : (
      `${item.source.userName}@${item.source.host}`
    );

  const renderActions = (item: SourceStatus, justify: "left" | "right") => (
    <SourceRowActions
      source={item}
      snapshotNowLoading={newSnapshotActions.loading}
      onSnapshotNow={(info) => newSnapshotActions.execute(info)}
      justify={justify}
    />
  );

  const renderNarrowDetails = (item: SourceStatus) => (
    <Stack gap={6}>
      <SourceStatusCell source={item} bytesStringBase2={bytesStringBase2} />
      {renderMeta(item)}
      {renderActions(item, "left")}
    </Stack>
  );

  const renderMeta = (item: SourceStatus) => {
    const size = item.lastSnapshot?.rootEntry?.summ?.size;
    return (
      <MetaLine
        items={[
          { key: "owner", content: renderOwner(item) },
          { key: "size", content: size === undefined ? null : sizeDisplayName(size, bytesStringBase2) },
          {
            key: "last",
            content: item.lastSnapshot ? <RelativeDate value={item.lastSnapshot.startTime} /> : null
          }
        ]}
      />
    );
  };

  return (
    <Container fluid>
      <Stack>
        <Title order={1}>
          <Trans>Snapshots</Trans>
        </Title>
        <Group justify="space-between">
          <Group>
            <MenuButton
              prefix={t`Refresh:`}
              options={[
                { label: t`Disabled`, value: "" },
                { label: t`3 seconds`, value: "3000" },
                { label: t`10 seconds`, value: "10000" },
                { label: t`30 seconds`, value: "30000" },
                { label: t`1 minute`, value: "60000" },
                { label: t`5 minutes`, value: "300000" }
              ]}
              value={refreshInterval?.toString()}
              onClick={(val) => setRefreshInterval(val === "" ? null : parseInt(val))}
            />
            {data?.multiUser === true && (
              <MenuButton
                options={[
                  { label: <Trans>All Snapshots</Trans>, value: "all" },
                  { label: <Trans>Local Snapshots</Trans>, value: "local" },
                  { label: "", value: "divider" },
                  ...uniqueOwners.map((own) => ({
                    label: own,
                    value: own
                  }))
                ]}
                onClick={setFilterState}
                disabled={loadAction.loading && loadAction.loadingKey == "loading"}
              />
            )}
          </Group>
          <Group>
            <Button
              disabled={loadAction.loading && loadAction.loadingKey == "loading"}
              onClick={setShow.open}
              {...newActionProps}
            >
              <Trans>New Snapshot</Trans>
            </Button>
            <RefreshButton
              loading={loadAction.loading && loadAction.loadingKey === "refresh"}
              onClick={() => loadAction.execute(undefined, "refresh")}
            />
            <Button
              loading={syncAction.loading}
              onClick={() => syncAction.execute()}
              {...refreshButtonProps}
              leftSection={<IconRefreshAlert size={16} />}
              color="grape"
            >
              <Trans>Sync</Trans>
            </Button>
          </Group>
        </Group>
        <Divider />
        <PageState hasData={data !== undefined} loading={data === undefined && !intError} error={intError}>
          <DataGrid
            records={visibleData}
            loading={loadAction.loading && loadAction.loadingKey === "loading"}
            idAccessor="source.path"
            noRecordsText={t`No snapshots taken`}
            noRecordsIcon={<IconWrapper icon={IconFileDatabase} size={48} />}
            pageSize={tablePageSize}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            columns={[
              {
                accessor: "source.path",
                title: <Trans>Path</Trans>,
                sortable: true,
                render: (item) => (
                  <ResponsiveCell
                    hiddenFrom="md"
                    secondary={renderNarrowDetails(item)}
                    primary={
                      <Group gap="5" wrap="nowrap" align="flex-start">
                        <Box style={{ flexShrink: 0, display: "flex" }}>
                          <IconWrapper icon={IconFolderOpen} color="yellow" size={18} />
                        </Box>
                        <Anchor
                          component={Link}
                          to={sourceHistoryLink(item.source)}
                          td="none"
                          fz="sm"
                          style={{ overflowWrap: "break-word", minWidth: 0 }}
                        >
                          {item.source.path.split("/").map((segment, index, all) => (
                            <Fragment key={all.slice(0, index + 1).join("/")}>
                              {segment}
                              {index < all.length - 1 && (
                                <>
                                  /<wbr />
                                </>
                              )}
                            </Fragment>
                          ))}
                        </Anchor>
                      </Group>
                    }
                  />
                )
              },
              {
                accessor: "owner",
                title: <Trans>Owner</Trans>,
                sortable: true,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: renderOwner
              },
              {
                accessor: "lastSnapshot.rootEntry.summ.size",
                sortable: true,
                title: <Trans>Size</Trans>,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: (item) => {
                  const size = item.lastSnapshot?.rootEntry?.summ?.size;
                  return size === undefined ? <EmptyCell /> : sizeDisplayName(size, bytesStringBase2);
                }
              },
              {
                accessor: "lastSnapshot.startTime",
                sortable: true,
                title: <Trans>Last Snapshot</Trans>,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: (item) =>
                  item.lastSnapshot ? <RelativeDate value={item.lastSnapshot.startTime} /> : <EmptyCell />
              },
              {
                accessor: "status",
                title: <Trans>Status</Trans>,
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: (item) => <SourceStatusCell source={item} bytesStringBase2={bytesStringBase2} />
              },
              {
                accessor: "",
                title: <IconClick size={16} />,
                textAlign: "right",
                width: "0%",
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                render: (item) => renderActions(item, "right")
              }
            ]}
          />
        </PageState>
      </Stack>
      {show && (
        <NewSnapshotModal
          onSnapshotted={() => {
            setShow.close();
            loadAction.execute(undefined, "refresh");
          }}
          onCancel={setShow.close}
        />
      )}
    </Container>
  );
}

export default SnapshotsPage;

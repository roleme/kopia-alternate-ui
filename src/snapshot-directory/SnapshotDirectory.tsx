import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Container,
  CopyButton,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip
} from "@mantine/core";
import { useDebouncedValue, useDisclosure, useInputState, usePrevious } from "@mantine/hooks";
import {
  IconCheck,
  IconClick,
  IconCopy,
  IconFileDelta,
  IconFileDownload,
  IconFolderOpen,
  IconSearch
} from "@tabler/icons-react";
import orderBy from "lodash.orderby";
import type { DataTableSortStatus } from "mantine-datatable";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../core/context/AppContext";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { DataGrid } from "../core/DataGrid/DataGrid";
import FormattedDate from "../core/FormattedDate";
import useApiRequest from "../core/hooks/useApiRequest";
import IconWrapper from "../core/IconWrapper";
import { MetaLine } from "../core/MetaLine";
import { PageHeader } from "../core/PageHeader/PageHeader";
import { PageState } from "../core/PageState/PageState";
import { ResponsiveCell } from "../core/ResponsiveCell";
import { RowAction } from "../core/RowAction";
import { type DirEntry, type DirManifest, type MountedSnapshot } from "../core/types";
import sizeDisplayName from "../utils/formatSize";
import { onlyUnique } from "../utils/onlyUnique";
import DirectoryCrumbs from "./components/DirectoryCrumbs";
import MountButton from "./components/MountButton";
import { getFileIcon } from "./fileIcons";
import RestoreModal from "./modals/RestoreModal";

function SnapshotDirectory() {
  const { kopiaService } = useServerInstanceContext();
  const { pageSize: tablePageSize, bytesStringBase2 } = useAppContext();
  const { oid } = useParams();
  const previousOid = usePrevious(oid);
  const navigate = useNavigate();
  const [data, setData] = useState<DirManifest>();
  const [mount, setMount] = useState<MountedSnapshot>();
  const location = useLocation();
  const [show, setShow] = useDisclosure();
  const [query, setQuery] = useInputState("");
  const [debouncedQuery] = useDebouncedValue(query, 200);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<DirEntry>>({
    columnAccessor: "name",
    direction: "asc"
  });

  const { error, execute, loading, loadingKey } = useApiRequest({
    action: () => kopiaService.getObjects(oid as string),
    onReturn(resp) {
      setData(resp);
    }
  });

  const getMountAction = useApiRequest({
    action: (oid?: string) => kopiaService.getMountedSnapshot(oid!),
    onReturn(mnt) {
      setMount(mnt);
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: need-to-fix-later
  useEffect(() => {
    if (previousOid != oid) {
      execute(undefined, "loading");
      getMountAction.execute(oid);
    }
  }, [oid]);

  const hasError = error !== undefined;

  const visibleItems = useMemo(() => {
    let items = [...(data?.entries || [])];

    if (debouncedQuery !== "") {
      items = items.filter((x) => x.name.indexOf(debouncedQuery) !== -1);
    }

    const itemTypes = items.map((x) => x.type).filter(onlyUnique).length;
    const entries = orderBy(
      items,
      itemTypes > 1 ? ["type", sortStatus.columnAccessor] : sortStatus.columnAccessor,
      sortStatus.direction
    ) as DirEntry[];
    return entries;
  }, [data, debouncedQuery, sortStatus]);

  const renderActions = (item: DirEntry) =>
    item.type !== "d" && (
      <RowAction
        label={t`Download`}
        icon={IconFileDownload}
        color="blue.5"
        href={kopiaService.objectUrl(item.obj, item.name)}
      />
    );

  const renderMeta = (item: DirEntry) => (
    <MetaLine
      items={[
        { key: "mtime", content: <FormattedDate value={item.mtime} /> },
        {
          key: "size",
          content: sizeDisplayName(item.type === "d" ? item.summ?.size || 0 : item.size || 0, bytesStringBase2)
        },
        { key: "files", content: item.type === "d" && item.summ ? t`${item.summ.files} files` : null },
        { key: "dirs", content: item.type === "d" && item.summ ? t`${item.summ.dirs} dirs` : null }
      ]}
    />
  );

  return (
    <Container fluid>
      <Stack>
        <PageHeader
          title={
            <>
              <Trans>Snapshot</Trans>: {oid}
            </>
          }
          subtitle={<DirectoryCrumbs />}
          onBack={() => navigate(-1)}
          onRefresh={() => execute(undefined, "refresh")}
          refreshing={loading && loadingKey === "refresh"}
          actions={
            <>
              <TextInput
                size="sm"
                placeholder={t`Search files or folder (current level)`}
                aria-label={t`Search files or folder (current level)`}
                leftSection={<IconSearch size={18} />}
                value={query}
                onChange={setQuery}
              />
              <Button
                size="xs"
                color="green"
                leftSection={<IconFileDelta size={16} />}
                onClick={setShow.open}
                disabled={hasError}
              >
                <Trans>Restore</Trans>
              </Button>
              {oid && <MountButton mount={mount} rootID={oid} onMounted={(mnt) => setMount(mnt)} disabled={hasError} />}
            </>
          }
        />
        <Divider />
        {mount && (
          <Alert title={t`Snapshot Mounted`} color="grape">
            <Trans>Snapshot is mounted at the following path</Trans>:
            <TextInput
              readOnly
              aria-label={t`Mount path`}
              defaultValue={mount.path}
              rightSection={
                <CopyButton value={mount.path} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? t`Copied` : t`Copy`} withArrow position="right">
                      <ActionIcon
                        color={copied ? "teal.5" : "gray.5"}
                        variant="subtle"
                        aria-label={copied ? t`Copied` : t`Copy`}
                        onClick={copy}
                      >
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              }
            />
          </Alert>
        )}
        <PageState hasData={data !== undefined} loading={data === undefined && !error} error={error}>
          <DataGrid
            idAccessor={(snap: DirEntry) => `${snap.obj}-${snap.type}-${snap.name}`}
            loading={loading && loadingKey === "loading"}
            records={visibleItems}
            noRecordsText={debouncedQuery !== "" ? t`No entries matching your search` : t`No entries in folder`}
            noRecordsIcon={<IconWrapper icon={IconFolderOpen} size={48} />}
            pageSize={tablePageSize}
            columns={[
              {
                accessor: "name",
                title: t`Name`,
                sortable: true,
                render: (item) => (
                  <ResponsiveCell
                    hiddenFrom="md"
                    secondary={
                      <Stack gap={6}>
                        {renderMeta(item)}
                        {renderActions(item)}
                      </Stack>
                    }
                    primary={
                      item.type === "d" ? (
                        <Group gap="5">
                          <IconWrapper icon={IconFolderOpen} color="yellow" size={18} />
                          <Anchor
                            component={Link}
                            to={`/snapshots/dir/${item.obj}`}
                            state={{
                              label: item.name,
                              oid: item.obj,
                              prevState: location.state
                            }}
                            td="none"
                            fz="sm"
                          >
                            {item.name}
                          </Anchor>
                        </Group>
                      ) : (
                        <Group gap="5">
                          <IconWrapper icon={getFileIcon(item.name)} color="blue" size={18} />
                          <Text fz="sm">{item.name}</Text>
                        </Group>
                      )
                    }
                  />
                )
              },
              {
                accessor: "mtime",
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                sortable: true,
                sortKey: "mtime",
                title: t`Last Modification`,
                render: (item) => <FormattedDate value={item.mtime} />
              },

              {
                accessor: "size",
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                title: t`Size`,
                textAlign: "right",
                render: (item) =>
                  sizeDisplayName(item.type === "d" ? item.summ?.size || 0 : item.size || 0, bytesStringBase2)
              },
              {
                accessor: "summ.files",
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                sortable: true,
                title: t`Files`,
                textAlign: "center"
              },
              {
                accessor: "summ.dirs",
                visibleMediaQuery: (theme) => `(min-width: ${theme.breakpoints.md})`,
                sortable: true,
                title: t`Dirs`,
                textAlign: "center"
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
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
          />
        </PageState>
      </Stack>
      {show && oid && (
        <RestoreModal
          onRestoreStarted={(task) => {
            setShow.close();
            navigate(`/tasks/${task.id}`);
          }}
          oid={oid}
          onCancel={setShow.close}
        />
      )}
    </Container>
  );
}

export default SnapshotDirectory;

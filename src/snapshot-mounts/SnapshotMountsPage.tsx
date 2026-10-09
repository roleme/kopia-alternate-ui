import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Anchor, Container, Divider, Stack } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconClick, IconFolderBolt, IconFolderMinus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { confirmAction } from "../core/confirmAction";
import { useAppContext } from "../core/context/AppContext";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { DataGrid } from "../core/DataGrid/DataGrid";
import useApiRequest from "../core/hooks/useApiRequest";
import IconWrapper from "../core/IconWrapper";
import { MetaLine } from "../core/MetaLine";
import { PageHeader } from "../core/PageHeader/PageHeader";
import { PageState } from "../core/PageState/PageState";
import { ResponsiveCell } from "../core/ResponsiveCell";
import { RowAction } from "../core/RowAction";
import type { MountedSnapshot } from "../core/types";

function SnapshotMountsPage() {
  const { kopiaService } = useServerInstanceContext();
  const { pageSize: tablePageSize } = useAppContext();
  const [data, setData] = useState<MountedSnapshot[]>();

  const loadMountsAction = useApiRequest({
    action: () => kopiaService.getMountedSnapshots(),
    onReturn(resp) {
      setData(resp.items);
    }
  });

  const unMountAction = useApiRequest({
    showErrorAsNotification: true,
    action: (oid?: string) => kopiaService.unMountSnapshot(oid!),
    onReturn() {
      loadMountsAction.execute(undefined, "refresh");
      showNotification({
        title: t`Snapshot unmounted`,
        message: t`The snapshot was unmounted from the host`,
        color: "green"
      });
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only load data on mount
  useEffect(() => {
    loadMountsAction.execute(undefined, "loading");
  }, []);

  const renderActions = (item: MountedSnapshot) => (
    <RowAction
      label={t`Unmount`}
      icon={IconFolderMinus}
      color="red.5"
      loading={unMountAction.loading && unMountAction.loadingKey === item.root}
      onClick={() =>
        confirmAction({
          title: t`Unmount snapshot?`,
          message: item.path,
          confirmLabel: t`Unmount`,
          cancelLabel: t`Cancel`,
          onConfirm: () => unMountAction.execute(item.root, item.root)
        })
      }
    />
  );

  return (
    <Container fluid>
      <Stack>
        <PageHeader
          title={<Trans>Mounted Snapshots</Trans>}
          onRefresh={() => loadMountsAction.execute(undefined, "refresh")}
          refreshing={loadMountsAction.loading && loadMountsAction.loadingKey === "refresh"}
        />

        <Divider />
        <PageState
          hasData={data !== undefined}
          loading={data === undefined && !loadMountsAction.error}
          error={loadMountsAction.error}
        >
          <DataGrid
            records={data ?? []}
            loading={loadMountsAction.loading && loadMountsAction.loadingKey === "loading"}
            idAccessor="path"
            noRecordsText={t`No snapshots mounted`}
            noRecordsIcon={<IconWrapper icon={IconFolderBolt} size={48} />}
            pageSize={tablePageSize}
            columns={[
              {
                accessor: "root",
                title: t`Snapshot ID`,
                width: "25%",
                render: (item) => (
                  <ResponsiveCell
                    hiddenFrom="md"
                    secondary={
                      <Stack gap={6}>
                        <MetaLine items={[{ key: "path", content: item.path }]} />
                        {renderActions(item)}
                      </Stack>
                    }
                    primary={
                      <Anchor component={Link} to={`/snapshots/dir/${item.root}`} td="none" fz="sm">
                        {item.root}
                      </Anchor>
                    }
                  />
                )
              },
              {
                accessor: "path",
                title: t`Mounted at`,
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

export default SnapshotMountsPage;

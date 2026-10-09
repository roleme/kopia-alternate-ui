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
import { ErrorAlert } from "../core/ErrorAlert/ErrorAlert";
import useApiRequest from "../core/hooks/useApiRequest";
import IconWrapper from "../core/IconWrapper";
import { PageHeader } from "../core/PageHeader/PageHeader";
import { RowAction } from "../core/RowAction";
import type { MountedSnapshot } from "../core/types";

function SnapshotMountsPage() {
  const { kopiaService } = useServerInstanceContext();
  const { pageSize: tablePageSize } = useAppContext();
  const [data, setData] = useState<MountedSnapshot[]>([]);

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

  return (
    <Container fluid>
      <Stack>
        <PageHeader
          title={<Trans>Mounted Snapshots</Trans>}
          onRefresh={() => loadMountsAction.execute(undefined, "refresh")}
          refreshing={loadMountsAction.loading && loadMountsAction.loadingKey === "refresh"}
        />

        <Divider />
        <ErrorAlert error={loadMountsAction.error} />
        <DataGrid
          records={data}
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
                <Anchor component={Link} to={`/snapshots/dir/${item.root}`} td="none" fz="sm">
                  {item.root}
                </Anchor>
              )
            },
            {
              accessor: "path",
              title: t`Mounted at`
            },
            {
              accessor: "actions",
              title: <IconClick size={16} />,
              width: "0%",
              textAlign: "right",
              render: (item) => (
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
              )
            }
          ]}
        />
      </Stack>
    </Container>
  );
}

export default SnapshotMountsPage;

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ActionIcon, Group, Menu, Tooltip } from "@mantine/core";
import { IconArrowsDiff, IconDots, IconFileCertificate, IconPackageExport } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useServerInstanceContext } from "../../core/context/ServerInstanceContext";
import useApiRequest from "../../core/hooks/useApiRequest";
import type { SourceInfo, SourceStatus } from "../../core/types";
import { compareSearch, pickComparePair } from "../comparePair";

type Props = {
  source: SourceStatus;
  snapshotNowLoading: boolean;
  onSnapshotNow: (source: SourceInfo) => void;
};

export default function SourceRowActions({ source, snapshotNowLoading, onSnapshotNow }: Props) {
  const { kopiaService } = useServerInstanceContext();
  const navigate = useNavigate();
  const info = source.source;
  const [notEnough, setNotEnough] = useState(false);

  const compareAction = useApiRequest({
    action: () => kopiaService.getSnapshot({ ...info, all: "1" }),
    showErrorAsNotification: true,
    onReturn(resp) {
      const pair = pickComparePair(resp.snapshots);
      if (pair === undefined) {
        setNotEnough(true);
        showNotification({
          title: t`Nothing to compare`,
          message: t`This source has only one snapshot`,
          color: "yellow"
        });
        return;
      }
      navigate(`/snapshots/compare?${compareSearch(info, pair)}`);
    }
  });

  const canCompare = source.lastSnapshot !== undefined && !notEnough;
  const canSnapshot = source.status === "IDLE" || source.status === "PAUSED";

  return (
    <Group gap={4} justify="right" wrap="nowrap">
      <Tooltip
        label={
          canCompare
            ? t`Compare latest snapshot with the previous one`
            : t`At least two snapshots are needed to compare`
        }
      >
        <ActionIcon
          variant="subtle"
          color="blue.5"
          aria-label={t`Compare latest snapshot with the previous one`}
          data-disabled={!canCompare || undefined}
          loading={compareAction.loading}
          onClick={canCompare ? () => compareAction.execute() : undefined}
        >
          <IconArrowsDiff size={18} />
        </ActionIcon>
      </Tooltip>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={t`More actions`}>
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {canSnapshot && (
            <Menu.Item
              leftSection={<IconPackageExport size={16} />}
              disabled={snapshotNowLoading}
              onClick={() => onSnapshotNow(info)}
            >
              <Trans>Snapshot Now</Trans>
            </Menu.Item>
          )}
          <Menu.Item
            component={Link}
            leftSection={<IconFileCertificate size={16} />}
            to={{
              pathname: "/policies",
              search: `userName=${info.userName}&host=${info.host}&path=${encodeURIComponent(info.path)}&viewPolicy=true`
            }}
          >
            <Trans>View Policy</Trans>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}

import { t } from "@lingui/core/macro";
import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconFileCertificate, IconPackageExport } from "@tabler/icons-react";
import { Link } from "react-router";
import IconWrapper from "../../core/IconWrapper";
import type { SourceInfo, SourceStatus } from "../../core/types";

type Props = {
  source: SourceStatus;
  snapshotNowLoading: boolean;
  onSnapshotNow: (source: SourceInfo) => void;
};

export default function SourceRowActions({ source, snapshotNowLoading, onSnapshotNow }: Props) {
  const status = source.status;
  if (status !== "IDLE" && status !== "PAUSED" && status !== "REMOTE") return null;
  const info = source.source;

  return (
    <Group gap={4} justify="right" wrap="nowrap">
      {status !== "REMOTE" && (
        <Tooltip label={t`Snapshot Now`}>
          <ActionIcon
            variant="subtle"
            color="green.5"
            loading={snapshotNowLoading}
            onClick={() => onSnapshotNow(info)}
          >
            <IconWrapper icon={IconPackageExport} size={18} />
          </ActionIcon>
        </Tooltip>
      )}
      <Tooltip label={t`View Policy`}>
        <ActionIcon
          component={Link}
          to={{
            pathname: "/policies",
            search: `userName=${info.userName}&host=${info.host}&path=${encodeURIComponent(info.path)}&viewPolicy=true`
          }}
          variant="subtle"
          color="grape.5"
        >
          <IconWrapper icon={IconFileCertificate} size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

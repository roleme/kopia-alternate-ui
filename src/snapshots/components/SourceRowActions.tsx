import { t } from "@lingui/core/macro";
import { Group } from "@mantine/core";
import { IconFileCertificate, IconPackageExport } from "@tabler/icons-react";
import { RowAction } from "../../core/RowAction";
import type { SourceInfo, SourceStatus } from "../../core/types";
import { sourcePolicyLink } from "../sourceLinks";

type Props = {
  source: SourceStatus;
  snapshotNowLoading: boolean;
  onSnapshotNow: (source: SourceInfo) => void;
  justify?: "left" | "right";
};

export default function SourceRowActions({ source, snapshotNowLoading, onSnapshotNow, justify = "right" }: Props) {
  const status = source.status;
  if (status !== "IDLE" && status !== "PAUSED" && status !== "REMOTE") return null;
  const info = source.source;

  return (
    <Group gap={4} justify={justify} wrap="nowrap">
      {status !== "REMOTE" && (
        <RowAction
          label={t`Snapshot now`}
          icon={IconPackageExport}
          color="green.5"
          loading={snapshotNowLoading}
          onClick={() => onSnapshotNow(info)}
        />
      )}
      <RowAction
        label={t`View Policy`}
        icon={IconFileCertificate}
        size={16}
        color="grape.5"
        to={sourcePolicyLink(info)}
      />
    </Group>
  );
}

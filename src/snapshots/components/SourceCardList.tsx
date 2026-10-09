import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import type { DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";
import { MenuButton } from "../../core/MenuButton/MenuButton";
import type { SourceInfo, SourceStatus } from "../../core/types";
import { SourceCard } from "./SourceCard";

type SortKey = "path" | "largest" | "latest";

const SORTS: Record<SortKey, DataTableSortStatus<SourceStatus>> = {
  path: { columnAccessor: "source.path", direction: "asc" },
  largest: { columnAccessor: "lastSnapshot.rootEntry.summ.size", direction: "desc" },
  latest: { columnAccessor: "lastSnapshot.startTime", direction: "desc" }
};

type Props = {
  sources: SourceStatus[];
  pageSize: number;
  bytesStringBase2: boolean;
  snapshotNowLoading: boolean;
  onSnapshotNow: (source: SourceInfo) => void;
  onSortChange: (sort: DataTableSortStatus<SourceStatus>) => void;
};

export default function SourceCardList({
  sources,
  pageSize,
  bytesStringBase2,
  snapshotNowLoading,
  onSnapshotNow,
  onSortChange
}: Props) {
  const [limit, setLimit] = useState(pageSize);

  return (
    <div>
      <Group mb="xs">
        <MenuButton
          options={[
            { label: t`Folder name`, value: "path" },
            { label: t`Largest first`, value: "largest" },
            { label: t`Latest snapshot first`, value: "latest" }
          ]}
          onClick={(value) => onSortChange(SORTS[value as SortKey])}
        />
      </Group>

      {sources.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          <Trans>No snapshots taken</Trans>
        </Text>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {sources.slice(0, limit).map((source) => (
            <SourceCard
              key={`${source.source.userName}@${source.source.host}:${source.source.path}`}
              source={source}
              bytesStringBase2={bytesStringBase2}
              snapshotNowLoading={snapshotNowLoading}
              onSnapshotNow={onSnapshotNow}
            />
          ))}
        </ul>
      )}

      {sources.length > limit && (
        <Button variant="subtle" fullWidth mt="xs" onClick={() => setLimit(limit + pageSize)}>
          <Trans>Show more</Trans>
        </Button>
      )}
    </div>
  );
}

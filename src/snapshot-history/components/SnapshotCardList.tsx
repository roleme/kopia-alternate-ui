import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Button, Group, Paper, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";
import { MenuButton } from "../../core/MenuButton/MenuButton";
import type { Snapshot } from "../../core/types";
import type { CountChange } from "../sizeChanges";
import { SnapshotCard } from "./SnapshotCard";

type SortKey = "newest" | "oldest" | "largest" | "files";

const SORTS: Record<SortKey, DataTableSortStatus<Snapshot>> = {
  newest: { columnAccessor: "startTime", direction: "desc" },
  oldest: { columnAccessor: "startTime", direction: "asc" },
  largest: { columnAccessor: "summary.size", direction: "desc" },
  files: { columnAccessor: "summary.files", direction: "desc" }
};

type Props = {
  snapshots: Snapshot[];
  pageSize: number;
  sourcePath: string;
  bytesStringBase2: boolean;
  sizeChanges: Map<string, number | undefined>;
  countChanges: Map<string, CountChange>;
  hasPrevious: (snapshot: Snapshot) => boolean;
  selected: Snapshot[];
  onSelectedChange: (selected: Snapshot[]) => void;
  onDeleteSelected: () => void;
  onSortChange: (sort: DataTableSortStatus<Snapshot>) => void;
  onCompare: (snapshot: Snapshot) => void;
  onDescribe: (snapshot: Snapshot) => void;
  onPin: (snapshot: Snapshot) => void;
  onEditPin: (snapshot: Snapshot, pin: string) => void;
};

export default function SnapshotCardList({
  snapshots,
  pageSize,
  sourcePath,
  bytesStringBase2,
  sizeChanges,
  countChanges,
  hasPrevious,
  selected,
  onSelectedChange,
  onDeleteSelected,
  onSortChange,
  onCompare,
  onDescribe,
  onPin,
  onEditPin
}: Props) {
  const [selecting, setSelecting] = useState(false);
  const [limit, setLimit] = useState(pageSize);
  const shown = snapshots.slice(0, limit);

  const toggle = (snapshot: Snapshot) => {
    onSelectedChange(
      selected.some((s) => s.id === snapshot.id)
        ? selected.filter((s) => s.id !== snapshot.id)
        : [...selected, snapshot]
    );
  };

  const setSelectMode = (next: boolean) => {
    setSelecting(next);
    if (!next) onSelectedChange([]);
  };

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <MenuButton
          options={[
            { label: t`Newest first`, value: "newest" },
            { label: t`Oldest first`, value: "oldest" },
            { label: t`Largest first`, value: "largest" },
            { label: t`Most files first`, value: "files" }
          ]}
          onClick={(value) => onSortChange(SORTS[value as SortKey])}
        />
        <Button size="xs" variant="light" onClick={() => setSelectMode(!selecting)}>
          {selecting ? <Trans>Cancel</Trans> : <Trans>Select</Trans>}
        </Button>
      </Group>

      {snapshots.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          <Trans>No snapshots taken</Trans>
        </Text>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {shown.map((snapshot) => {
            const counts = countChanges.get(snapshot.id);
            return (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                sourcePath={sourcePath}
                bytesStringBase2={bytesStringBase2}
                sizeChange={sizeChanges.get(snapshot.id)}
                fileChange={counts?.files}
                dirChange={counts?.dirs}
                canCompare={hasPrevious(snapshot)}
                selecting={selecting}
                selected={selected.some((s) => s.id === snapshot.id)}
                onToggle={() => toggle(snapshot)}
                onCompare={() => onCompare(snapshot)}
                onDescribe={() => onDescribe(snapshot)}
                onPin={() => onPin(snapshot)}
                onEditPin={(pin) => onEditPin(snapshot, pin)}
              />
            );
          })}
        </ul>
      )}

      {snapshots.length > limit && (
        <Button variant="subtle" fullWidth mt="xs" onClick={() => setLimit(limit + pageSize)}>
          <Trans>Show more</Trans>
        </Button>
      )}

      {selecting && (
        <Paper withBorder shadow="md" p="sm" mt="sm" pos="sticky" bottom={8} style={{ zIndex: 10 }}>
          <Group justify="space-between">
            <Text fw={700} fz="sm">
              {t`${selected.length} selected`}
            </Text>
            <Button
              color="red"
              size="xs"
              leftSection={<IconTrash size={16} />}
              disabled={selected.length === 0}
              onClick={onDeleteSelected}
            >
              {t`Delete ${selected.length}`}
            </Button>
          </Group>
        </Paper>
      )}
    </div>
  );
}

import { Group } from "@mantine/core";
import type { ReactNode } from "react";

type Item = {
  key: string;
  content: ReactNode;
};

type Props = {
  items: Item[];
};

export function MetaLine({ items }: Props) {
  const visible = items.filter(
    ({ content }) => content !== null && content !== undefined && content !== false && content !== ""
  );
  if (visible.length === 0) return null;

  return (
    <Group gap="sm" fz="xs" c="dimmed" align="center" style={{ rowGap: 2 }}>
      {visible.map(({ key, content }) => (
        <span key={key}>{content}</span>
      ))}
    </Group>
  );
}

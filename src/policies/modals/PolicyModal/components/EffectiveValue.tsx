import { t } from "@lingui/core/macro";
import { Badge, Group, Text } from "@mantine/core";
import type { ValueOrigin } from "../utils/policyDefinition";
import type { EffectiveField } from "./useEffectiveField";

function originLabel(origin: ValueOrigin) {
  switch (origin) {
    case "here":
      return t`set here`;
    case "inherited":
      return t`inherited`;
    case "default":
      return t`default`;
  }
}

type Props = EffectiveField & { compact?: boolean };

export default function EffectiveValue({ summary, origin, compact }: Props) {
  return (
    <Group
      gap="xs"
      wrap="nowrap"
      justify={compact ? "start" : "end"}
      mr={compact ? 0 : "md"}
      maw="100%"
      visibleFrom={compact ? undefined : "sm"}
      hiddenFrom={compact ? "sm" : undefined}
    >
      {summary !== undefined && (
        <Text ff="monospace" fz="xs" truncate title={summary}>
          {summary}
        </Text>
      )}
      <Badge variant="light" color="gray" size="xs" radius="sm" tt="none" fw={500} style={{ flexShrink: 0 }}>
        {originLabel(origin)}
      </Badge>
    </Group>
  );
}

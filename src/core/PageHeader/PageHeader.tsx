import { t } from "@lingui/core/macro";
import { ActionIcon, Group, Stack, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { RefreshButton } from "../RefreshButton";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, onBack, onRefresh, refreshing, actions }: Props) {
  return (
    <Group justify="space-between" align="flex-start" gap="sm">
      <Group wrap="nowrap" gap="xs" miw={0}>
        {onBack && (
          <ActionIcon variant="subtle" size="lg" aria-label={t`Back`} onClick={onBack}>
            <IconArrowLeft size={24} />
          </ActionIcon>
        )}
        <Stack gap={0} miw={0}>
          <Title order={1}>{title}</Title>
          {subtitle}
        </Stack>
      </Group>
      {(actions || onRefresh) && (
        <Group gap="xs">
          {actions}
          {onRefresh && <RefreshButton loading={refreshing} onClick={onRefresh} />}
        </Group>
      )}
    </Group>
  );
}

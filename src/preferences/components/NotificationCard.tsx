import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Card,
  CardSection,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Stack,
  Text
} from "@mantine/core";
import {
  IconBrandPushover,
  IconDots,
  IconMail,
  IconPencil,
  IconTestPipe,
  IconTrash,
  IconWebhook
} from "@tabler/icons-react";
import IconWrapper from "../../core/IconWrapper";
import type { NotificationProfile } from "../../core/types";
import { notificationDestination, type SeverityName, severityName } from "../notificationSummary";

type Props = {
  data: NotificationProfile;
  disabled: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTest: () => void;
};
function severityLabel(severity: number): string {
  const labels: Record<SeverityName, string> = {
    verbose: t`Verbose`,
    success: t`Success`,
    report: t`Report`,
    warning: t`Warning`,
    error: t`Error`
  };
  const name = severityName(severity);
  return name ? labels[name] : String(severity);
}

function NotificationCard({ data, disabled, onDelete, onEdit, onTest }: Props) {
  const getIcon = () => {
    switch (data.method.type) {
      case "webhook":
        return <IconWrapper icon={IconWebhook} color="grape" size={24} />;
      case "email":
        return <IconWrapper icon={IconMail} color="green" size={24} />;
      case "pushover":
        return <IconWrapper icon={IconBrandPushover} color="blue" size={24} />;
    }
  };

  return (
    <Card withBorder radius="xs">
      <CardSection withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group>
            {getIcon()}
            <Text fw={500}>{data.profile}</Text>
          </Group>
          <Menu withinPortal position="bottom-end" shadow="sm" disabled={disabled}>
            <MenuTarget>
              <ActionIcon variant="light" color="gray" disabled={disabled}>
                <IconDots size={16} />
              </ActionIcon>
            </MenuTarget>

            <MenuDropdown>
              <MenuItem leftSection={<IconWrapper icon={IconPencil} color="yellow" size={18} />} onClick={onEdit}>
                <Trans>Edit</Trans>
              </MenuItem>
              <MenuItem leftSection={<IconWrapper icon={IconTestPipe} color="grape" size={18} />} onClick={onTest}>
                <Trans>Send test notification</Trans>
              </MenuItem>
              <MenuItem
                leftSection={<IconWrapper icon={IconTrash} color="red" size={18} />}
                color="red"
                onClick={onDelete}
              >
                <Trans>Delete</Trans>
              </MenuItem>
            </MenuDropdown>
          </Menu>
        </Group>
      </CardSection>
      <CardSection p="xs">
        <Stack gap="xs">
          <Stack gap={0}>
            <Text c="dimmed" fz="xs">
              <Trans>Destination</Trans>
            </Text>
            <Text fz="sm" ff="monospace">
              {notificationDestination(data) || "-"}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text c="dimmed" fz="xs">
              <Trans>Minimum Severity</Trans>
            </Text>
            <Text fz="sm">{`>= ${severityLabel(data.minSeverity)}`}</Text>
          </Stack>
        </Stack>
      </CardSection>
    </Card>
  );
}

export default NotificationCard;

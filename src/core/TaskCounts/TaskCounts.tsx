import { t } from "@lingui/core/macro";
import { Anchor, Group, Text, Tooltip } from "@mantine/core";
import { IconCircleCheck, IconCircleX, IconStopwatch } from "@tabler/icons-react";
import { Link } from "react-router";
import IconWrapper from "../IconWrapper";
import { useTaskCounts } from "./useTaskCounts";

export function TaskCounts() {
  const { success, failed, running } = useTaskCounts();

  return (
    <Group gap="sm">
      {success > 0 && (
        <Tooltip label={t`${success} task(s) completed`}>
          <Anchor component={Link} to="/tasks" c="inherit" td="none">
            <Group gap={5}>
              <IconWrapper icon={IconCircleCheck} color="green" size={16} />
              <Text fz="sm" ff="monospace">
                {success}
              </Text>
            </Group>
          </Anchor>
        </Tooltip>
      )}
      {failed > 0 && (
        <Tooltip label={t`${failed} task(s) failed in the last 24 hours`}>
          <Anchor component={Link} to="/tasks" c="inherit" td="none">
            <Group gap={5}>
              <IconWrapper icon={IconCircleX} color="red" size={16} />
              <Text fz="sm" ff="monospace">
                {failed}
              </Text>
            </Group>
          </Anchor>
        </Tooltip>
      )}
      {running > 0 && (
        <Tooltip label={t`${running} task(s) in progress`}>
          <Anchor component={Link} to="/tasks" c="inherit" td="none">
            <Group gap={5}>
              <IconWrapper icon={IconStopwatch} color="teal" size={18} />
              <Text fz="sm" ff="monospace">
                {running}
              </Text>
            </Group>
          </Anchor>
        </Tooltip>
      )}
    </Group>
  );
}

import { AppShellFooter, Group } from "@mantine/core";
import { TaskCounts } from "../TaskCounts/TaskCounts";
import { ConnectionInfo } from "./ConnectionInfo";

export function Footer() {
  return (
    <AppShellFooter p="xs">
      <Group justify="space-between">
        <Group>
          <ConnectionInfo />
        </Group>
        <TaskCounts />
      </Group>
    </AppShellFooter>
  );
}

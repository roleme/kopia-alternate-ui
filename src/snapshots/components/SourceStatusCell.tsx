import { Plural, Trans } from "@lingui/react/macro";
import { Anchor, Group, Loader, Progress, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import RelativeDate from "../../core/RelativeDate";
import type { SourceStatus } from "../../core/types";
import { sourceHistoryLink } from "../sourceLinks";
import { formatByteProgress, getSourceStatusView } from "../sourceStatus";

type Props = {
  source: SourceStatus;
  bytesStringBase2: boolean;
};

export default function SourceStatusCell({ source, bytesStringBase2 }: Props) {
  const view = getSourceStatusView(source);

  switch (view.kind) {
    case "running":
      if (view.percent === undefined || view.doneBytes === undefined || view.totalBytes === undefined) {
        return (
          <Group gap={6} wrap="nowrap">
            <Loader size="xs" type="dots" />
            <Text fz="sm" c="blue">
              <Trans>Running</Trans>
            </Text>
          </Group>
        );
      }
      return (
        <Stack gap={4} miw={150}>
          <Text fz="sm" c="blue" ff="monospace" style={{ whiteSpace: "nowrap" }}>
            {view.percent}% - {formatByteProgress(view.doneBytes, view.totalBytes, bytesStringBase2)}
          </Text>
          <Progress value={view.percent} size={4} animated />
        </Stack>
      );
    case "queued":
      return (
        <Text fz="sm" c="dimmed">
          <Trans>Queued</Trans>
        </Text>
      );
    case "paused":
      return (
        <Text fz="sm" c="dimmed">
          <Trans>Paused</Trans>
        </Text>
      );
    case "manual":
      return (
        <Text fz="sm" c="dimmed">
          <Trans>Manual</Trans>
        </Text>
      );
    case "errors":
      return (
        <Anchor component={Link} to={sourceHistoryLink(source.source)} fz="sm" c="red" td="none">
          <Plural value={view.count} one="# error" other="# errors" />
        </Anchor>
      );
    case "overdue":
      return (
        <Text fz="sm" c="yellow.6" style={{ whiteSpace: "nowrap" }}>
          <Trans>
            Overdue - due <RelativeDate value={view.dueAt} />
          </Trans>
        </Text>
      );
    case "due":
      return (
        <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
          <Trans>
            Due <RelativeDate value={view.dueAt} />
          </Trans>
        </Text>
      );
    case "scheduled":
      return (
        <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
          <RelativeDate value={view.at} />
        </Text>
      );
    case "firstRun":
      return (
        <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
          <Trans>
            First run <RelativeDate value={view.at} />
          </Trans>
        </Text>
      );
    default:
      return <EmptyCell />;
  }
}

export function EmptyCell() {
  return (
    <Text fz="sm" c="dimmed">
      –
    </Text>
  );
}

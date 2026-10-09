import { Trans } from "@lingui/react/macro";
import { Skeleton, Stack, Text, VisuallyHidden } from "@mantine/core";
import type { PropsWithChildren, ReactNode } from "react";
import { ErrorAlert } from "../ErrorAlert/ErrorAlert";
import type { ErrorInformation } from "../hooks/useApiRequest";

const LOADING_ROWS = ["a", "b", "c", "d", "e"];

type Props = PropsWithChildren<{
  loading?: boolean;
  error?: ErrorInformation;
  empty?: boolean;
  emptyText?: ReactNode;
  emptyIcon?: ReactNode;
}>;

export function PageState({ loading, error, empty, emptyText, emptyIcon, children }: Props) {
  if (loading) {
    return (
      <Stack gap="xs" role="status" aria-busy="true">
        <VisuallyHidden>
          <Trans>Loading</Trans>
        </VisuallyHidden>
        {LOADING_ROWS.map((row) => (
          <Skeleton key={row} h={36} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (error) {
    return <ErrorAlert error={error} />;
  }

  if (empty) {
    return (
      <Stack align="center" gap="xs" py="xl">
        {emptyIcon}
        <Text c="dimmed">{emptyText ?? <Trans>Nothing to show</Trans>}</Text>
      </Stack>
    );
  }

  return <>{children}</>;
}

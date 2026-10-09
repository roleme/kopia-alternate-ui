import { Box, type MantineBreakpoint, Stack } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  primary: ReactNode;
  secondary?: ReactNode;
  hiddenFrom: MantineBreakpoint;
};

export function ResponsiveCell({ primary, secondary, hiddenFrom }: Props) {
  return (
    <Stack gap={4}>
      {primary}
      {secondary && <Box hiddenFrom={hiddenFrom}>{secondary}</Box>}
    </Stack>
  );
}

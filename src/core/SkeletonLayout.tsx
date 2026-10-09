import { Trans } from "@lingui/react/macro";
import { AppShell, Container, Group, Skeleton, Stack, VisuallyHidden } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { MobileHeaderSkeleton, SidebarSkeleton } from "./Sidebar/SidebarSkeleton";
import { SHELL_PROPS } from "./Sidebar/shellLayout";
import classes from "./SkeletonLayout.module.css";
import { MAIN_CONTENT_ID } from "./SkipLink/SkipLink";

const ROWS = [
  { id: "a", path: 70 },
  { id: "b", path: 55 },
  { id: "c", path: 80 },
  { id: "d", path: 62 },
  { id: "e", path: 48 },
  { id: "f", path: 75 },
  { id: "g", path: 58 },
  { id: "h", path: 66 }
];

function ContentSkeleton() {
  return (
    <Container fluid>
      <Stack>
        <div className={classes.title}>
          <Skeleton h={28} w={180} />
        </div>
        <Group gap="md">
          <Skeleton h={36} w={200} radius="sm" />
          <Skeleton h={36} w={200} radius="sm" />
        </Group>
        <div className={classes.table}>
          <div className={classes.tableHeader}>
            <Skeleton h={10} w={60} />
          </div>
          {ROWS.map((row) => (
            <div key={row.id} className={classes.tableRow}>
              <div className={classes.pathCell}>
                <Skeleton h={10} w={`${row.path}%`} />
              </div>
              <div className={classes.cell}>
                <Skeleton h={10} w="70%" />
              </div>
              <div className={classes.cellNarrow}>
                <Skeleton h={10} w="60%" />
              </div>
              <div className={classes.cell}>
                <Skeleton h={10} w="55%" />
              </div>
            </div>
          ))}
        </div>
      </Stack>
    </Container>
  );
}

function SkeletonLayout({ children }: PropsWithChildren) {
  return (
    <AppShell {...SHELL_PROPS}>
      <MobileHeaderSkeleton />
      <SidebarSkeleton />
      <AppShell.Main id={MAIN_CONTENT_ID}>
        {children ?? (
          <div role="status" aria-busy="true">
            <VisuallyHidden>
              <Trans>Loading</Trans>
            </VisuallyHidden>
            <ContentSkeleton />
          </div>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default SkeletonLayout;

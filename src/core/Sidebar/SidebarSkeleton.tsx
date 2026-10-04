import { AppShellHeader, AppShellNavbar, Group, Skeleton, Text } from "@mantine/core";
import { NAV_GROUPS } from "./navItems";
import classes from "./Sidebar.module.css";
import skeletonClasses from "./SidebarSkeleton.module.css";

const LABEL_WIDTHS = [72, 52, 44, 70, 76, 80];

export function SidebarSkeleton() {
  let index = 0;
  return (
    <AppShellNavbar p="xs" visibleFrom="md">
      <div className={classes.content}>
        <div className={`${classes.brand} ${skeletonClasses.brand}`}>
          <Text fw="bold" fz="lg">
            Kopia UI
          </Text>
        </div>
        <div>
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <div className={skeletonClasses.groupLabel}>
                <Skeleton h={8} w={64} />
              </div>
              {group.items.map((item) => {
                const width = LABEL_WIDTHS[index++ % LABEL_WIDTHS.length];
                return (
                  <div key={item.id} className={skeletonClasses.link}>
                    <Skeleton h={17} w={17} radius="sm" />
                    <Skeleton h={10} w={width} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className={classes.bottom}>
          <div className={classes.bottomRow}>
            <div className={skeletonClasses.bottomRowServer}>
              <Skeleton h={8} w={8} circle />
              <Skeleton h={10} w={120} />
            </div>
          </div>
          <div className={classes.bottomRow}>
            <div className={skeletonClasses.bottomRowCounts}>
              <Skeleton h={12} w={28} />
              <Skeleton h={12} w={28} />
              <Skeleton h={12} w={28} />
            </div>
          </div>
        </div>
      </div>
    </AppShellNavbar>
  );
}

export function MobileHeaderSkeleton() {
  return (
    <AppShellHeader hiddenFrom="md">
      <Group h="100%" px="md" gap="sm" wrap="nowrap">
        <Skeleton h={28} w={28} radius="sm" />
        <Text fw="bold" fz="lg">
          Kopia UI
        </Text>
      </Group>
    </AppShellHeader>
  );
}

import { t } from "@lingui/core/macro";
import { AppShellHeader, Burger, Drawer, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { SidebarContent } from "./Sidebar";
import classes from "./Sidebar.module.css";

export function MobileHeader() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the drawer whenever the route changes
  useEffect(() => {
    close();
  }, [pathname]);

  return (
    <>
      <AppShellHeader hiddenFrom="md">
        <Group h="100%" px="md" gap="sm" wrap="nowrap">
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            aria-label={t`Toggle navigation`}
            aria-expanded={opened}
            aria-controls="mobile-navigation"
          />
          <Link to="/" className={classes.brand} style={{ padding: 0 }}>
            <Text fw="bold" fz="lg">
              Kopia UI
            </Text>
          </Link>
        </Group>
      </AppShellHeader>
      <Drawer
        id="mobile-navigation"
        opened={opened}
        onClose={close}
        hiddenFrom="md"
        size={260}
        title={
          <Text fw="bold" fz="lg">
            Kopia UI
          </Text>
        }
        closeButtonProps={{ "aria-label": t`Close navigation` }}
        classNames={{ body: classes.drawerBody }}
      >
        <SidebarContent onNavigate={close} showBrand={false} />
      </Drawer>
    </>
  );
}

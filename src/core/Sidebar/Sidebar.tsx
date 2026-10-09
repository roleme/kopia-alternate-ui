import { t } from "@lingui/core/macro";
import { AppShellNavbar, NavLink as MantineNavLink, Text } from "@mantine/core";
import {
  IconClipboardCheck,
  IconDatabase,
  IconFileCertificate,
  IconFolderBolt,
  IconPackage,
  IconSettings
} from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
import { useAppContext } from "../context/AppContext";
import { ConnectionInfo } from "../Footer/ConnectionInfo";
import IconWrapper from "../IconWrapper";
import { TaskCounts } from "../TaskCounts/TaskCounts";
import { findActiveNavItem, NAV_GROUPS, type NavGroupId, type NavItemId } from "./navItems";
import classes from "./Sidebar.module.css";

const ICONS: Record<NavItemId, typeof IconSettings> = {
  snapshots: IconPackage,
  mounts: IconFolderBolt,
  tasks: IconClipboardCheck,
  policies: IconFileCertificate,
  repo: IconDatabase,
  preferences: IconSettings
};

function itemLabel(id: NavItemId) {
  switch (id) {
    case "snapshots":
      return t`Snapshots`;
    case "mounts":
      return t`Mounts`;
    case "tasks":
      return t`Tasks`;
    case "policies":
      return t`Policies`;
    case "repo":
      return t`Repository`;
    case "preferences":
      return t`Preferences`;
  }
}

function groupLabel(id: NavGroupId) {
  switch (id) {
    case "backups":
      return t`Backups`;
    case "configuration":
      return t`Configuration`;
  }
}

export function SidebarContent({ onNavigate, showBrand = true }: { onNavigate?: () => void; showBrand?: boolean }) {
  const { repoStatus } = useAppContext();
  const location = useLocation();
  const activeId = findActiveNavItem(location.pathname);

  return (
    <div className={classes.content}>
      {showBrand && (
        <Link to="/" className={classes.brand} onClick={onNavigate}>
          <Text fw="bold" fz="lg">
            Kopia UI
          </Text>
        </Link>
      )}
      <nav aria-label={t`Main navigation`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <Text className={classes.groupLabel}>{groupLabel(group.id)}</Text>
            {group.items.map((item) => {
              const disabled = item.requiresConnection && !repoStatus.connected;
              const active = item.id === activeId;
              const icon = <IconWrapper icon={ICONS[item.id]} size={17} />;
              return disabled ? (
                <MantineNavLink
                  key={item.id}
                  className={classes.link}
                  label={itemLabel(item.id)}
                  leftSection={icon}
                  disabled
                />
              ) : (
                <MantineNavLink
                  key={item.id}
                  className={classes.link}
                  component={Link}
                  to={item.to}
                  label={itemLabel(item.id)}
                  leftSection={icon}
                  active={active}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                />
              );
            })}
          </div>
        ))}
      </nav>
      <div className={classes.bottom}>
        <div className={classes.bottomRow}>
          <ConnectionInfo />
        </div>
        <div className={classes.bottomRow}>
          <TaskCounts />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <AppShellNavbar p="xs" visibleFrom="md" role="none">
      <SidebarContent />
    </AppShellNavbar>
  );
}

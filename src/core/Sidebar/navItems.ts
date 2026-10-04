export type NavItemId = "snapshots" | "mounts" | "tasks" | "policies" | "repo" | "preferences";
export type NavGroupId = "backups" | "configuration";

export type NavItemDefinition = {
  id: NavItemId;
  to: string;
  requiresConnection: boolean;
};

export type NavGroupDefinition = {
  id: NavGroupId;
  items: NavItemDefinition[];
};

export const NAV_GROUPS: NavGroupDefinition[] = [
  {
    id: "backups",
    items: [
      { id: "snapshots", to: "/snapshots", requiresConnection: true },
      { id: "mounts", to: "/mounts", requiresConnection: true },
      { id: "tasks", to: "/tasks", requiresConnection: false }
    ]
  },
  {
    id: "configuration",
    items: [
      { id: "policies", to: "/policies", requiresConnection: true },
      { id: "repo", to: "/repo", requiresConnection: false },
      { id: "preferences", to: "/preferences", requiresConnection: false }
    ]
  }
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function findActiveNavItem(pathname: string): NavItemId | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  let best: NavItemDefinition | undefined;
  for (const item of ALL_ITEMS) {
    if (path === item.to || path.startsWith(`${item.to}/`)) {
      if (!best || item.to.length > best.to.length) {
        best = item;
      }
    }
  }
  return best?.id;
}

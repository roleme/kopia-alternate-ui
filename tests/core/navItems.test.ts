import { describe, expect, it } from "vitest";
import { findActiveNavItem, NAV_GROUPS } from "../../src/core/Sidebar/navItems";

describe("findActiveNavItem", () => {
  it("matches each destination exactly", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        expect(findActiveNavItem(item.to)).toBe(item.id);
      }
    }
  });

  it("highlights snapshots for nested snapshot routes", () => {
    expect(findActiveNavItem("/snapshots/compare")).toBe("snapshots");
    expect(findActiveNavItem("/snapshots/single-source")).toBe("snapshots");
    expect(findActiveNavItem("/snapshots/dir/k9077848b7782f7dab2cf55c37c94caf2")).toBe("snapshots");
  });

  it("highlights tasks for task details", () => {
    expect(findActiveNavItem("/tasks/abc123")).toBe("tasks");
  });

  it("ignores a trailing slash", () => {
    expect(findActiveNavItem("/policies/")).toBe("policies");
  });

  it("does not match on a partial segment", () => {
    expect(findActiveNavItem("/snapshotsfoo")).toBeUndefined();
    expect(findActiveNavItem("/repository")).toBeUndefined();
  });

  it("returns undefined for the root and unknown routes", () => {
    expect(findActiveNavItem("/")).toBeUndefined();
    expect(findActiveNavItem("/nope")).toBeUndefined();
  });
});

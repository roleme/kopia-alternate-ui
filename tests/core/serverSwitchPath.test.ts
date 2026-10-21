import { describe, expect, it } from "vitest";
import { pathAfterServerSwitch } from "../../src/core/serverSwitchPath";

describe("pathAfterServerSwitch", () => {
  it.each([
    ["/snapshots/single-source", "/snapshots"],
    ["/snapshots/dir/k9077", "/snapshots"],
    ["/snapshots/compare", "/snapshots"],
    ["/tasks/41", "/tasks"]
  ])("leaves %s for the list page", (pathname, expected) => {
    expect(pathAfterServerSwitch(pathname)).toBe(expected);
  });

  it.each(["/snapshots", "/tasks", "/policies", "/mounts", "/repo", "/preferences"])("stays on %s", (pathname) => {
    expect(pathAfterServerSwitch(pathname)).toBeUndefined();
  });
});

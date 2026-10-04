import { describe, expect, it } from "vitest";
import { DEFAULT_ACTION_TIMEOUT, nextActionTimeout } from "../../src/policies/modals/PolicyModal/utils/actionTimeout";

describe("nextActionTimeout", () => {
  it("preserves an existing timeout when a script is set", () => {
    expect(nextActionTimeout("echo hi", 600)).toBe(600);
  });

  it("defaults to 300 when a script is set and no timeout exists", () => {
    expect(nextActionTimeout("echo hi", undefined)).toBe(DEFAULT_ACTION_TIMEOUT);
    expect(DEFAULT_ACTION_TIMEOUT).toBe(300);
  });

  it("clears the timeout when the script is cleared", () => {
    expect(nextActionTimeout("", 600)).toBeUndefined();
    expect(nextActionTimeout(undefined, 600)).toBeUndefined();
  });

  it("is decided per action from that action's own timeout", () => {
    const actions: Record<string, { script?: string; timeout?: number }> = {
      beforeSnapshotRoot: { script: "a", timeout: 600 },
      afterSnapshotRoot: { script: "b" },
      beforeFolder: { script: "c", timeout: 30 },
      afterFolder: { script: "d" }
    };
    const result = Object.fromEntries(
      Object.entries(actions).map(([key, a]) => [key, nextActionTimeout(a.script, a.timeout)])
    );
    expect(result).toEqual({ beforeSnapshotRoot: 600, afterSnapshotRoot: 300, beforeFolder: 30, afterFolder: 300 });
  });
});

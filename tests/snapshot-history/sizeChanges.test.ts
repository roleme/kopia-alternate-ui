import { describe, expect, it } from "vitest";
import { sizeChangesById } from "../../src/snapshot-history/sizeChanges";

const snap = (id: string, startTime: string, size: number) => ({ id, startTime, summary: { size } });

describe("sizeChangesById", () => {
  it("is empty for no snapshots", () => {
    expect(sizeChangesById([]).size).toBe(0);
  });

  it("leaves the oldest snapshot blank", () => {
    const changes = sizeChangesById([snap("a", "2026-10-01T00:00:00Z", 100)]);
    expect(changes.get("a")).toBeUndefined();
    expect(changes.has("a")).toBe(true);
  });

  it("computes the delta against the chronologically previous snapshot regardless of input order", () => {
    const changes = sizeChangesById([
      snap("c", "2026-10-03T00:00:00Z", 90),
      snap("a", "2026-10-01T00:00:00Z", 100),
      snap("b", "2026-10-02T00:00:00Z", 140)
    ]);
    expect(changes.get("a")).toBeUndefined();
    expect(changes.get("b")).toBe(40);
    expect(changes.get("c")).toBe(-50);
  });

  it("reports zero when the size is unchanged", () => {
    const changes = sizeChangesById([snap("a", "2026-10-01T00:00:00Z", 100), snap("b", "2026-10-02T00:00:00Z", 100)]);
    expect(changes.get("b")).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { compareSearch, pickComparePair } from "../../src/snapshots/comparePair";

const snap = (id: string, startTime: string, rootID: string) => ({ id, startTime, rootID });

describe("pickComparePair", () => {
  it("returns nothing for no snapshots", () => {
    expect(pickComparePair([])).toBeUndefined();
  });

  it("returns nothing for a single snapshot", () => {
    expect(pickComparePair([snap("a", "2026-10-01T00:00:00Z", "r1")])).toBeUndefined();
  });

  it("pairs the newest with the immediately previous snapshot when roots differ", () => {
    const pair = pickComparePair([snap("a", "2026-10-01T00:00:00Z", "r1"), snap("b", "2026-10-02T00:00:00Z", "r2")]);
    expect(pair?.newer.id).toBe("b");
    expect(pair?.older.id).toBe("a");
  });

  it("skips older snapshots that share the newest root", () => {
    const pair = pickComparePair([
      snap("a", "2026-10-01T00:00:00Z", "r1"),
      snap("b", "2026-10-02T00:00:00Z", "r2"),
      snap("c", "2026-10-03T00:00:00Z", "r2"),
      snap("d", "2026-10-04T00:00:00Z", "r2")
    ]);
    expect(pair?.newer.id).toBe("d");
    expect(pair?.older.id).toBe("a");
  });

  it("picks the nearest older snapshot with a different root", () => {
    const pair = pickComparePair([
      snap("a", "2026-10-01T00:00:00Z", "r0"),
      snap("b", "2026-10-02T00:00:00Z", "r1"),
      snap("c", "2026-10-03T00:00:00Z", "r3"),
      snap("d", "2026-10-04T00:00:00Z", "r3")
    ]);
    expect(pair?.older.id).toBe("b");
  });

  it("falls back to the immediately previous snapshot when every older root is identical", () => {
    const pair = pickComparePair([
      snap("a", "2026-10-01T00:00:00Z", "r1"),
      snap("b", "2026-10-02T00:00:00Z", "r1"),
      snap("c", "2026-10-03T00:00:00Z", "r1")
    ]);
    expect(pair?.newer.id).toBe("c");
    expect(pair?.older.id).toBe("b");
  });

  it("does not depend on input order and does not mutate it", () => {
    const input = [
      snap("c", "2026-10-03T00:00:00Z", "r3"),
      snap("a", "2026-10-01T00:00:00Z", "r1"),
      snap("b", "2026-10-02T00:00:00Z", "r2")
    ];
    const pair = pickComparePair(input);
    expect(pair?.newer.id).toBe("c");
    expect(pair?.older.id).toBe("b");
    expect(input.map((s) => s.id)).toEqual(["c", "a", "b"]);
  });
});

describe("compareSearch", () => {
  it("builds the compare query with the older root as a and the newest as b", () => {
    const search = compareSearch(
      { host: "mininas", userName: "root", path: "/volume1/photo" },
      { older: snap("a", "x", "kOLD"), newer: snap("b", "y", "kNEW") }
    );
    const params = new URLSearchParams(search);
    expect(params.get("host")).toBe("mininas");
    expect(params.get("userName")).toBe("root");
    expect(params.get("path")).toBe("/volume1/photo");
    expect(params.get("a")).toBe("kOLD");
    expect(params.get("b")).toBe("kNEW");
  });
});

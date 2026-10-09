import { describe, expect, test } from "vitest";
import { normalizeRefreshInterval } from "../../src/snapshots/refreshInterval";

describe("normalizeRefreshInterval", () => {
  test("maps the value stored by the old 10 seconds option to 10 seconds", () => {
    expect(normalizeRefreshInterval(15000)).toBe(10000);
  });
  test("keeps other intervals", () => {
    expect(normalizeRefreshInterval(3000)).toBe(3000);
    expect(normalizeRefreshInterval(10000)).toBe(10000);
    expect(normalizeRefreshInterval(60000)).toBe(60000);
  });
  test("keeps disabled", () => {
    expect(normalizeRefreshInterval(null)).toBeNull();
  });
});

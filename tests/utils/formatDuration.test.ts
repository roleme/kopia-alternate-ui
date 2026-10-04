import { describe, expect, test } from "vitest";
import formatDuration from "../../src/utils/formatDuration";

const s = 1000;
const m = 60 * s;
const h = 60 * m;

describe("formatDuration", () => {
  test("formats whole minutes without corrupting zeros", () => {
    expect(formatDuration(30 * m)).toBe("30m");
    expect(formatDuration(10 * m)).toBe("10m");
  });
  test("formats minutes and seconds", () => {
    expect(formatDuration(5 * m + 10 * s)).toBe("5m 10s");
    expect(formatDuration(59 * m + 59 * s)).toBe("59m 59s");
  });
  test("formats seconds", () => {
    expect(formatDuration(10 * s)).toBe("10s");
    expect(formatDuration(30 * s)).toBe("30s");
  });
  test("formats hours", () => {
    expect(formatDuration(h)).toBe("1h");
    expect(formatDuration(2 * h + 5 * m + 3 * s)).toBe("2h 5m 3s");
    expect(formatDuration(10 * h + 30 * m)).toBe("10h 30m");
  });
  test("keeps milliseconds for short durations", () => {
    expect(formatDuration(450)).toBe("450ms");
    expect(formatDuration(2 * s + 345)).toBe("2s 345ms");
    expect(formatDuration(10 * s)).toBe("10s");
  });
  test("drops milliseconds above ten seconds", () => {
    expect(formatDuration(10 * s + 1)).toBe("10s");
    expect(formatDuration(5 * m + 10 * s + 123)).toBe("5m 10s");
    expect(formatDuration(30 * m + 2 * s + 999)).toBe("30m 2s");
  });
  test("handles zero and negative", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(-5)).toBe("0s");
  });
});

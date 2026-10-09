import { describe, expect, test } from "vitest";
import { parseColorScheme } from "../../src/utils/parseColorScheme";

describe("parseColorScheme", () => {
  test("returns light when unknown", () => {
    expect(parseColorScheme("blue")).toBe("light");
  });
  test("returns light when light", () => {
    expect(parseColorScheme("light")).toBe("light");
  });
  test("returns auto when auto", () => {
    expect(parseColorScheme("auto")).toBe("auto");
  });
  test("returns dark when dark", () => {
    expect(parseColorScheme("dark")).toBe("dark");
  });
});

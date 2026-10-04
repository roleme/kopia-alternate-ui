import { describe, expect, test } from "vitest";
import signedSizeDisplayName from "../../src/utils/formatSignedSize";

describe("signedSizeDisplayName", () => {
  test("prefixes growth with plus and shrink with minus", () => {
    expect(signedSizeDisplayName(1200, false)).toBe("+1.2 KB");
    expect(signedSizeDisplayName(-3000000, false)).toBe("−3 MB");
  });
  test("shows zero without a sign", () => {
    expect(signedSizeDisplayName(0, false)).toBe("0 B");
  });
});

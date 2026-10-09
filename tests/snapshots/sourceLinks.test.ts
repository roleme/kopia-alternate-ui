import { describe, expect, test } from "vitest";
import { sourceHistoryLink, sourcePolicyLink } from "../../src/snapshots/sourceLinks";

const source = { userName: "root", host: "nas", path: "/volume1/photo & video" };

describe("sourceHistoryLink", () => {
  test("targets the single source page with an encoded path", () => {
    expect(sourceHistoryLink(source)).toEqual({
      pathname: "/snapshots/single-source",
      search: "?userName=root&host=nas&path=%2Fvolume1%2Fphoto%20%26%20video"
    });
  });
});

describe("sourcePolicyLink", () => {
  test("targets the policy viewer with an encoded path", () => {
    expect(sourcePolicyLink(source)).toEqual({
      pathname: "/policies",
      search: "userName=root&host=nas&path=%2Fvolume1%2Fphoto%20%26%20video&viewPolicy=true"
    });
  });
});

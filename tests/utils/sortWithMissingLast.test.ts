import { describe, expect, test } from "vitest";
import { sortWithMissingLast } from "../../src/utils/sortWithMissingLast";

type Row = { name: string; last?: { size?: number } };

const rows: Row[] = [
  { name: "none" },
  { name: "mid", last: { size: 5 } },
  { name: "big", last: { size: 9 } },
  { name: "small", last: { size: 1 } },
  { name: "empty", last: {} }
];

describe("sortWithMissingLast", () => {
  test("ascending puts missing values last", () => {
    expect(sortWithMissingLast(rows, "last.size", "asc").map((r) => r.name)).toEqual([
      "small",
      "mid",
      "big",
      "none",
      "empty"
    ]);
  });

  test("descending puts missing values last too", () => {
    expect(sortWithMissingLast(rows, "last.size", "desc").map((r) => r.name)).toEqual([
      "big",
      "mid",
      "small",
      "none",
      "empty"
    ]);
  });

  test("sorts on a plain key", () => {
    expect(sortWithMissingLast([{ name: "b" }, { name: "a" }], "name", "asc").map((r) => r.name)).toEqual(["a", "b"]);
  });

  test("does not change the input", () => {
    const copy = [...rows];
    sortWithMissingLast(rows, "last.size", "desc");
    expect(rows).toEqual(copy);
  });
});

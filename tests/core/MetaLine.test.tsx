import { describe, expect, test } from "vitest";
import { MetaLine } from "../../src/core/MetaLine";
import { render } from "../testing-utils";

describe("MetaLine", () => {
  test("renders every item", () => {
    const { container, getByText } = render(
      <MetaLine
        items={[
          { key: "size", content: "1.2 GB" },
          { key: "files", content: "340 files" },
          { key: "dirs", content: "12 dirs" }
        ]}
      />
    );

    expect(getByText("1.2 GB")).toBeTruthy();
    expect(getByText("340 files")).toBeTruthy();
    expect(getByText("12 dirs")).toBeTruthy();
    expect(container.querySelectorAll(".mantine-Group-root > span")).toHaveLength(3);
  });

  test("skips empty items", () => {
    const { container, getByText } = render(
      <MetaLine
        items={[
          { key: "a", content: null },
          { key: "b", content: "kept" },
          { key: "c", content: false },
          { key: "d", content: "" }
        ]}
      />
    );

    expect(getByText("kept")).toBeTruthy();
    expect(container.querySelectorAll(".mantine-Group-root > span")).toHaveLength(1);
  });

  test("renders nothing when every item is empty", () => {
    const { container } = render(<MetaLine items={[{ key: "a", content: null }]} />);

    expect(container.querySelector(".mantine-Group-root")).toBeNull();
  });
});

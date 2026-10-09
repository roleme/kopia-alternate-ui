import { describe, expect, test } from "vitest";
import { ResponsiveCell } from "../../src/core/ResponsiveCell";
import { render } from "../testing-utils";

describe("ResponsiveCell", () => {
  test("renders primary content and the secondary line", () => {
    const { getByText } = render(
      <ResponsiveCell primary={<span>primary</span>} secondary={<span>secondary</span>} hiddenFrom="lg" />
    );

    expect(getByText("primary")).toBeTruthy();
    expect(getByText("secondary")).toBeTruthy();
  });

  test("secondary line is hidden from the given breakpoint up", () => {
    const { getByText } = render(
      <ResponsiveCell primary={<span>primary</span>} secondary={<span>secondary</span>} hiddenFrom="lg" />
    );

    expect(getByText("secondary").parentElement?.className).toContain("mantine-hidden-from-lg");
  });

  test("primary content is never hidden", () => {
    const { getByText } = render(
      <ResponsiveCell primary={<span>primary</span>} secondary={<span>secondary</span>} hiddenFrom="lg" />
    );

    expect(getByText("primary").parentElement?.className ?? "").not.toContain("mantine-hidden-from");
  });

  test("no secondary wrapper without secondary content", () => {
    const { container } = render(<ResponsiveCell primary={<span>primary</span>} hiddenFrom="lg" />);

    expect(container.querySelector("[class*=mantine-hidden-from]")).toBeNull();
  });
});

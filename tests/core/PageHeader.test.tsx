import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PageHeader } from "../../src/core/PageHeader/PageHeader";
import { render } from "../testing-utils";

describe("PageHeader", () => {
  test("renders the title as the page heading", () => {
    const { getByRole } = render(<PageHeader title="Tasks" />);

    expect(getByRole("heading", { level: 1, name: "Tasks" })).toBeTruthy();
  });

  test("back button is named and calls onBack", async () => {
    const onBack = vi.fn();
    const { getByRole } = render(<PageHeader title="Tasks" onBack={onBack} />);

    await userEvent.click(getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("no back button without onBack", () => {
    const { queryByRole } = render(<PageHeader title="Tasks" />);

    expect(queryByRole("button", { name: "Back" })).toBeNull();
  });

  test("refresh button calls onRefresh and actions render before it", async () => {
    const onRefresh = vi.fn();
    const { getAllByRole, getByRole } = render(
      <PageHeader title="Tasks" onRefresh={onRefresh} actions={<button type="button">New</button>} />
    );

    await userEvent.click(getByRole("button", { name: "Refresh" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(getAllByRole("button").map((b) => b.textContent)).toEqual(["New", "Refresh"]);
  });

  test("no actions group without actions or refresh", () => {
    const { queryAllByRole } = render(<PageHeader title="Tasks" />);

    expect(queryAllByRole("button")).toHaveLength(0);
  });
});

import { IconPin } from "@tabler/icons-react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { RowAction } from "../../src/core/RowAction";
import { render } from "../testing-utils";

describe("RowAction", () => {
  test("button variant has an accessible name and calls onClick", async () => {
    const onClick = vi.fn();
    const { getByRole } = render(<RowAction label="Pin snapshot" icon={IconPin} onClick={onClick} />);

    const button = getByRole("button", { name: "Pin snapshot" });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("router link variant renders a named link", () => {
    const { getByRole } = render(<RowAction label="View policy" icon={IconPin} to="/policies?x=1" />);

    expect(getByRole("link", { name: "View policy" }).getAttribute("href")).toBe("/policies?x=1");
  });

  test("href variant renders a named anchor", () => {
    const { getByRole } = render(<RowAction label="Download" icon={IconPin} href="/api/file" />);

    expect(getByRole("link", { name: "Download" }).getAttribute("href")).toBe("/api/file");
  });

  test("disabled button does not call onClick", async () => {
    const onClick = vi.fn();
    const { getByRole } = render(<RowAction label="Pin snapshot" icon={IconPin} onClick={onClick} disabled />);

    await userEvent.click(getByRole("button", { name: "Pin snapshot" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

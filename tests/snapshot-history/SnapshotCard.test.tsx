import { describe, expect, test, vi } from "vitest";
import type { Snapshot } from "../../src/core/types";
import { SnapshotCard } from "../../src/snapshot-history/components/SnapshotCard";
import { render } from "../testing-utils";

const snapshot = (overrides: Partial<Snapshot> = {}): Snapshot =>
  ({
    id: "s1",
    rootID: "root1",
    startTime: "2026-10-09T15:09:16Z",
    endTime: "2026-10-09T15:12:00Z",
    description: "before upgrade",
    retention: ["latest-1", "daily-1"],
    pins: [],
    summary: { size: 1000, files: 356570, symlinks: 0, dirs: 5950, maxTime: "", numFailed: 0 },
    ...overrides
  }) as Snapshot;

const props = {
  sourcePath: "/volume1/photo",
  bytesStringBase2: true,
  canCompare: true,
  selecting: false,
  selected: false,
  onToggle: vi.fn(),
  onCompare: vi.fn(),
  onDescribe: vi.fn(),
  onPin: vi.fn(),
  onEditPin: vi.fn()
};

describe("SnapshotCard", () => {
  test("the card links to the snapshot's files", () => {
    const { container } = render(<SnapshotCard snapshot={snapshot()} {...props} />);

    expect(container.querySelector("a")?.getAttribute("href")).toBe("/snapshots/dir/root1");
  });

  test("shows description, labels, counts and the change in file count", () => {
    const { getByText } = render(<SnapshotCard snapshot={snapshot()} fileChange={270} {...props} />);

    expect(getByText("before upgrade")).toBeTruthy();
    expect(getByText("latest-1")).toBeTruthy();
    expect(getByText("daily-1")).toBeTruthy();
    expect(getByText("+270")).toBeTruthy();
  });

  test("shows no change marker when a count did not change", () => {
    const { queryByText } = render(<SnapshotCard snapshot={snapshot()} fileChange={0} dirChange={0} {...props} />);

    expect(queryByText("+0")).toBeNull();
  });

  test("shows the failed count only when something failed", () => {
    const failing = snapshot({ summary: { size: 1, files: 1, symlinks: 0, dirs: 1, maxTime: "", numFailed: 2 } });
    const { getByText, queryByText, rerender } = render(<SnapshotCard snapshot={failing} {...props} />);

    expect(getByText("2 failed")).toBeTruthy();

    rerender(<SnapshotCard snapshot={snapshot()} {...props} />);
    expect(queryByText(/failed/)).toBeNull();
  });

  test("shows the pin name", () => {
    const { getByText } = render(<SnapshotCard snapshot={snapshot({ pins: ["do-not-delete"] })} {...props} />);

    expect(getByText("do-not-delete")).toBeTruthy();
  });

  test("in selection mode it is a checkbox, not a link, and has no actions menu", () => {
    const { container, getByRole, queryByRole } = render(
      <SnapshotCard snapshot={snapshot()} {...props} selecting selected />
    );

    expect(container.querySelector("a")).toBeNull();
    expect(getByRole("checkbox", { checked: true })).toBeTruthy();
    expect(queryByRole("button", { name: "Snapshot actions" })).toBeNull();
  });

  test("the actions menu is available when not selecting", () => {
    const { getByRole } = render(<SnapshotCard snapshot={snapshot()} {...props} />);

    expect(getByRole("button", { name: "Snapshot actions" })).toBeTruthy();
  });
});

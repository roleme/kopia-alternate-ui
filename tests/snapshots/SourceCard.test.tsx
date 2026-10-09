import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { SourceStatus } from "../../src/core/types";
import { SourceCard } from "../../src/snapshots/components/SourceCard";
import { render } from "../testing-utils";

const source = (overrides: Partial<SourceStatus> = {}): SourceStatus =>
  ({
    source: { userName: "root", host: "mininas", path: "/volume1/photo/immich" },
    status: "IDLE",
    schedule: { intervalSeconds: 10800 },
    nextSnapshotTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    lastSnapshot: {
      startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
      rootEntry: { summ: { size: 516 * 1024 ** 3, files: 1, dirs: 1, symlinks: 0, numFailed: 0, maxTime: "" } }
    },
    ...overrides
  }) as SourceStatus;

const props = { bytesStringBase2: true, snapshotNowLoading: false, onSnapshotNow: vi.fn() };

describe("SourceCard", () => {
  test("the card links to the folder's snapshot list", () => {
    const { container } = render(<SourceCard source={source()} {...props} />);

    const href = container.querySelector("a")?.getAttribute("href") ?? "";
    expect(href).toContain("/snapshots/single-source");
    expect(href).toContain(encodeURIComponent("/volume1/photo/immich"));
  });

  test("shows the path, owner and size", () => {
    const { getByText } = render(<SourceCard source={source()} {...props} />);

    expect(getByText("root@mininas")).toBeTruthy();
    expect(getByText("516 GiB")).toBeTruthy();
  });

  test("shows a dash when there is no snapshot yet", () => {
    const { getByText } = render(<SourceCard source={source({ lastSnapshot: undefined })} {...props} />);

    expect(getByText("–")).toBeTruthy();
  });

  test("shows the error count when the last snapshot had errors", () => {
    const failing = source();
    failing.lastSnapshot!.stats = { errorCount: 3 } as never;
    const { getByText } = render(<SourceCard source={failing} {...props} />);

    expect(getByText("3 errors")).toBeTruthy();
  });

  test("an idle folder offers Snapshot now and Policy", () => {
    const { getByRole } = render(<SourceCard source={source()} {...props} />);

    expect(getByRole("button", { name: "Snapshot now" })).toBeTruthy();
    expect(getByRole("link", { name: "View Policy" })).toBeTruthy();
  });

  test("Snapshot now starts a snapshot of that folder", async () => {
    const onSnapshotNow = vi.fn();
    const { getByRole } = render(<SourceCard source={source()} {...props} onSnapshotNow={onSnapshotNow} />);

    await userEvent.click(getByRole("button", { name: "Snapshot now" }));

    expect(onSnapshotNow).toHaveBeenCalledWith({ userName: "root", host: "mininas", path: "/volume1/photo/immich" });
  });

  test("a remote folder is tagged and only offers Policy", () => {
    const { getByText, queryByRole, getByRole } = render(
      <SourceCard source={source({ status: "REMOTE" })} {...props} />
    );

    expect(getByText("Remote")).toBeTruthy();
    expect(queryByRole("button", { name: "Snapshot now" })).toBeNull();
    expect(getByRole("link", { name: "View Policy" })).toBeTruthy();
  });

  test("a running folder shows its progress and offers no actions", () => {
    const running = source({
      status: "UPLOADING",
      upload: { estimatedBytes: 1000, hashedBytes: 400, cachedBytes: 0 } as never
    });
    const { getByText, queryByRole } = render(<SourceCard source={running} {...props} />);

    expect(getByText(/Running/)).toBeTruthy();
    expect(queryByRole("button", { name: "Snapshot now" })).toBeNull();
    expect(queryByRole("link", { name: "View Policy" })).toBeNull();
  });
});

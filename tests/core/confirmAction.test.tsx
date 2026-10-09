import { modals } from "@mantine/modals";
import { afterEach, describe, expect, test, vi } from "vitest";
import { confirmAction } from "../../src/core/confirmAction";

describe("confirmAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("opens a destructive confirm modal with the given labels", () => {
    const open = vi.spyOn(modals, "openConfirmModal").mockReturnValue("id");
    const onConfirm = vi.fn();

    confirmAction({
      title: "Cancel task?",
      message: "It stops the task.",
      confirmLabel: "Cancel task",
      cancelLabel: "Keep running",
      onConfirm
    });

    expect(open).toHaveBeenCalledTimes(1);
    const args = open.mock.calls[0][0];
    expect(args.title).toBe("Cancel task?");
    expect(args.labels).toEqual({ confirm: "Cancel task", cancel: "Keep running" });
    expect(args.confirmProps).toMatchObject({ color: "red" });
    expect(onConfirm).not.toHaveBeenCalled();
    args.onConfirm?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

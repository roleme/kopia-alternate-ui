import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { ReactNode } from "react";

type Options = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
};

export function confirmAction({ title, message, confirmLabel, cancelLabel, onConfirm }: Options) {
  modals.openConfirmModal({
    title,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps: { color: "red", size: "xs" },
    cancelProps: { size: "xs" },
    onConfirm
  });
}

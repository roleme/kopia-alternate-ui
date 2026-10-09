import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { confirmAction } from "../../../../core/confirmAction";
import { useServerInstanceContext } from "../../../../core/context/ServerInstanceContext";
import useApiRequest from "../../../../core/hooks/useApiRequest";
import type { SourceInfo } from "../../../../core/types";

type Props = {
  sourceInfo: SourceInfo;
  onDeleted: () => void;
};

export default function DeletePolicyButton({ sourceInfo, onDeleted }: Props) {
  const { kopiaService } = useServerInstanceContext();
  const { execute, loading } = useApiRequest({
    action: () => kopiaService.deletePolicy(sourceInfo),
    onReturn() {
      onDeleted();
    },
    showErrorAsNotification: true
  });

  const openModal = () =>
    confirmAction({
      title: t`Delete policy`,
      message: <Trans>Are you sure you want to delete this policy?</Trans>,
      confirmLabel: t`Delete policy`,
      cancelLabel: t`Cancel`,
      onConfirm: () => execute()
    });

  return (
    <Button size="xs" leftSection={<IconTrash size={16} />} color="red" loading={loading} onClick={openModal}>
      <Trans>Delete</Trans>
    </Button>
  );
}

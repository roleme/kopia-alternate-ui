import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ActionIcon, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCheck, IconCircleCheck, IconPencil, IconX } from "@tabler/icons-react";
import { type KeyboardEvent, useState } from "react";
import { useAppContext } from "../../core/context/AppContext";
import { useServerInstanceContext } from "../../core/context/ServerInstanceContext";
import useApiRequest from "../../core/hooks/useApiRequest";

const MIN_LENGTH = 2;

export default function RepoDescription() {
  const { kopiaService } = useServerInstanceContext();
  const { reloadStatus, repoStatus } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  const updateAction = useApiRequest({
    action: (data?: string) => kopiaService.updateRepoDescription(data!),
    onReturn() {
      showNotification({
        title: t`Description updated`,
        message: t`The repository description was successfully updated`,
        color: "green",
        icon: <IconCircleCheck size={16} />
      });
      setEditing(false);
      reloadStatus();
    }
  });

  const startEditing = () => {
    setValue(repoStatus.description || "");
    setInvalid(false);
    setEditing(true);
  };

  const save = () => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) {
      setInvalid(true);
      return;
    }
    if (trimmed === repoStatus.description) {
      setEditing(false);
      return;
    }
    updateAction.execute(trimmed);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <Stack gap={0}>
      <Text fz="xs" c="dimmed">
        <Trans>Description</Trans>
      </Text>
      {editing ? (
        <Group gap="xs" wrap="nowrap">
          <TextInput
            flex={1}
            size="xs"
            autoFocus
            value={value}
            error={invalid ? t`Value is too short` : undefined}
            disabled={updateAction.loading}
            onChange={(e) => {
              setValue(e.currentTarget.value);
              setInvalid(false);
            }}
            onKeyDown={onKeyDown}
          />
          <Tooltip label={t`Save`}>
            <ActionIcon variant="subtle" color="green" loading={updateAction.loading} onClick={save}>
              <IconCheck size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t`Cancel`}>
            <ActionIcon variant="subtle" color="gray" disabled={updateAction.loading} onClick={() => setEditing(false)}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : (
        <Group gap="xs" wrap="nowrap">
          <Text fz="sm" c={repoStatus.description ? undefined : "dimmed"}>
            {repoStatus.description || "-"}
          </Text>
          <Tooltip label={t`Edit description`}>
            <ActionIcon variant="subtle" color="gray" aria-label={t`Edit description`} onClick={startEditing}>
              <IconPencil size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </Stack>
  );
}

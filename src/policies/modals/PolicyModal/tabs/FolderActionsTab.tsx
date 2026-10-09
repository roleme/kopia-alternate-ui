import { t } from "@lingui/core/macro";
import { Accordion, ActionIcon, ScrollAreaAutosize, TabsPanel, Tooltip } from "@mantine/core";
import { type UseFormReturnType } from "@mantine/form";
import { IconPencilCode } from "@tabler/icons-react";
import { useState } from "react";
import IconWrapper from "../../../../core/IconWrapper";
import type { Policy, PolicyDefinition } from "../../../../core/types";
import PolicyCodeEditModal from "../../PolicyCodeEditModal/PolicyCodeEditModal";
import PolicyNumberInput from "../policy-inputs/PolicyNumberInput";
import PolicySelect from "../policy-inputs/PolicySelect";
import PolicyTextInput from "../policy-inputs/PolicyTextInput";
import type { PolicyForm } from "../types";

type Props = {
  form: UseFormReturnType<PolicyForm>;
  resolvedValue?: Policy;
  definition?: PolicyDefinition;
};

export default function FolderActionsTab({ form, resolvedValue, definition }: Props) {
  const [action, setAction] = useState<string>();
  return (
    <TabsPanel value="folder-actions" px="xs">
      <ScrollAreaAutosize mah={600} scrollbarSize={4}>
        <Accordion variant="contained">
          <PolicyTextInput
            multiline
            id="before-folder"
            title={t`Before Folder`}
            description={t`Script to run before folder`}
            form={form}
            formKey="actions.beforeFolder.script"
            effective={resolvedValue?.actions?.beforeFolder?.script}
            effectiveDefinedIn={definition?.actions?.beforeFolder}
            rightSection={
              <Tooltip label={t`Open in large edit`}>
                <ActionIcon variant="subtle" color="gray" onClick={() => setAction("actions.beforeFolder.script")}>
                  <IconWrapper icon={IconPencilCode} size={16} />
                </ActionIcon>
              </Tooltip>
            }
          />
          <PolicyNumberInput
            id="before-timeout"
            title={t`Stop the before folder script after (seconds)`}
            description={t`Kopia stops the script if it runs longer than this`}
            form={form}
            formKey="actions.beforeFolder.timeout"
            effective={resolvedValue?.actions?.beforeFolder?.timeout}
            effectiveDefinedIn={definition?.actions?.beforeFolder}
          />
          <PolicySelect
            id="before-command-mode"
            title={t`If the before folder script fails`}
            description={t`Choose whether a failing script stops the backup, is ignored, or runs in the background without being waited for`}
            data={[
              { label: t`Stop the backup`, value: "essential" },
              { label: t`Keep going`, value: "optional" },
              {
                label: t`Run in the background and keep going`,
                value: "async"
              }
            ]}
            form={form}
            formKey="actions.beforeFolder.mode"
            effectiveDefinedIn={definition?.actions?.beforeFolder}
          />
          <PolicyTextInput
            multiline
            id="after-folder"
            title={t`After Folder`}
            description={t`Script to run after folder`}
            form={form}
            formKey="actions.afterFolder.script"
            effective={resolvedValue?.actions?.afterFolder?.script}
            effectiveDefinedIn={definition?.actions?.afterFolder}
            rightSection={
              <Tooltip label={t`Open in large edit`}>
                <ActionIcon variant="subtle" color="gray" onClick={() => setAction("actions.afterFolder.script")}>
                  <IconWrapper icon={IconPencilCode} size={16} />
                </ActionIcon>
              </Tooltip>
            }
          />
          <PolicyNumberInput
            id="after-timeout"
            title={t`Stop the after folder script after (seconds)`}
            description={t`Kopia stops the script if it runs longer than this`}
            form={form}
            formKey="actions.afterFolder.timeout"
            effective={resolvedValue?.actions?.afterFolder?.timeout}
            effectiveDefinedIn={definition?.actions?.afterFolder}
          />
          <PolicySelect
            id="after-command-mode"
            title={t`If the after folder script fails`}
            description={t`Choose whether a failing script stops the backup, is ignored, or runs in the background without being waited for`}
            data={[
              { label: t`Stop the backup`, value: "essential" },
              { label: t`Keep going`, value: "optional" },
              {
                label: t`Run in the background and keep going`,
                value: "async"
              }
            ]}
            form={form}
            formKey="actions.afterFolder.mode"
            effective={resolvedValue?.actions?.afterFolder?.mode}
            effectiveDefinedIn={definition?.actions?.afterFolder}
          />
        </Accordion>
      </ScrollAreaAutosize>
      {action && <PolicyCodeEditModal form={form} formKey={action} onClose={() => setAction(undefined)} />}
    </TabsPanel>
  );
}

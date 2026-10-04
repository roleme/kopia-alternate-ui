import { Trans } from "@lingui/react/macro";
import { AccordionControl, Group, Stack, Text } from "@mantine/core";
import { IconBan, IconCircleCheckFilled } from "@tabler/icons-react";
import IconWrapper from "../../../../core/IconWrapper";
import EffectiveValue from "./EffectiveValue";
import { useEffectiveField } from "./useEffectiveField";

type Props = {
  title: string;
  description: string;
  isConfigured: boolean;
  formKey?: string;
  definedValue?: unknown;
  optionData?: unknown;
  showValue?: boolean;
};

export default function PolicyAccordionControl({
  title,
  description,
  isConfigured,
  formKey,
  definedValue,
  optionData,
  showValue
}: Props) {
  const field = useEffectiveField(formKey, definedValue, optionData, showValue);
  return (
    <AccordionControl>
      <Stack gap={0}>
        <Group grow>
          <Text fz="sm">{title}</Text>
          <Stack gap={2} align="flex-end">
            {isConfigured ? (
              <Group gap={2} justify="end" mr="md">
                <IconWrapper icon={IconCircleCheckFilled} color="green" size={18} />
                <Text fz="xs" c="green">
                  <Trans>Configured</Trans>
                </Text>
              </Group>
            ) : (
              field === undefined && (
                <Group gap={2} justify="end" mr="md">
                  <IconWrapper icon={IconBan} color="gray" size={18} />
                  <Text fz="xs" c="gray">
                    <Trans>Not configured</Trans>
                  </Text>
                </Group>
              )
            )}
            {field && <EffectiveValue {...field} />}
          </Stack>
        </Group>
        <Text fz="xs" c="dimmed">
          {description}
        </Text>
        {field && <EffectiveValue {...field} compact />}
      </Stack>
    </AccordionControl>
  );
}

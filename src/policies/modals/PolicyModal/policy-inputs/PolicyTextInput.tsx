import { t } from "@lingui/core/macro";
import { AccordionItem, AccordionPanel, Group, Textarea, TextInput } from "@mantine/core";
import { getEffectiveValue } from "../../../policiesUtil";
import PolicyAccordionControl from "../components/PolicyAccordionControl";
import PolicyEffectiveLabel from "../components/PolicyEffectiveLabel";
import type { PolicyInput } from "../types";

const scriptStyles = {
  input: {
    fontFamily: "var(--mantine-font-family-monospace)",
    fontSize: "var(--mantine-font-size-xs)"
  }
} as const;

type Props = {
  id: string;
  title: string;
  description: string;
  placeholder?: string;
  effective?: string;
  rightSection?: React.ReactNode;
  multiline?: boolean;
} & PolicyInput;

export default function PolicyTextInput({
  id,
  title,
  description,
  placeholder,
  form,
  formKey,
  effective,
  rightSection,
  multiline,
  effectiveDefinedIn
}: Props) {
  const inputProps = form.getInputProps(formKey);
  const effectiveValue = getEffectiveValue(inputProps.value, effective);
  const isDefined = inputProps.value || effective;
  const effectiveLabel =
    effectiveDefinedIn && isDefined ? <PolicyEffectiveLabel sourceInfo={effectiveDefinedIn} /> : t`Effective`;
  return (
    <AccordionItem value={id}>
      <PolicyAccordionControl
        title={title}
        description={description}
        formKey={formKey}
        definedValue={inputProps.value}
        isConfigured={inputProps.value !== undefined && inputProps.value !== ""}
      />
      <AccordionPanel>
        <Group grow align="flex-start">
          {multiline ? (
            <Textarea
              label={t`Defined`}
              placeholder={placeholder}
              rightSection={rightSection}
              autosize
              minRows={3}
              maxRows={12}
              styles={scriptStyles}
              {...inputProps}
            />
          ) : (
            <TextInput label={t`Defined`} placeholder={placeholder} rightSection={rightSection} {...inputProps} />
          )}
          {multiline ? (
            <Textarea
              label={effectiveLabel}
              readOnly
              autosize
              minRows={3}
              maxRows={12}
              styles={scriptStyles}
              value={effectiveValue}
              variant="filled"
            />
          ) : (
            <TextInput label={effectiveLabel} readOnly value={effectiveValue} variant="filled" />
          )}
        </Group>
      </AccordionPanel>
    </AccordionItem>
  );
}

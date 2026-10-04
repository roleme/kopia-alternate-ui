import { t } from "@lingui/core/macro";
import { describeField, getRowSummary, type ValueOrigin } from "../utils/policyDefinition";
import { usePolicyResolved } from "./PolicyResolvedContext";

export type EffectiveField = {
  summary?: string;
  origin: ValueOrigin;
};

export function useEffectiveField(formKey?: string, definedValue?: unknown, optionData?: unknown, showValue = true) {
  const ctx = usePolicyResolved();
  const yes = t`Yes`;
  const no = t`No`;
  if (formKey === undefined || ctx?.resolved === undefined) return undefined;
  const field = describeField({
    effective: ctx.resolved.effective,
    definition: ctx.resolved.definition,
    path: formKey,
    target: ctx.target,
    definedValue
  });
  if (field === undefined) return undefined;
  return {
    summary: getRowSummary(field.value, showValue, { yes, no }, optionData),
    origin: field.origin
  } satisfies EffectiveField;
}

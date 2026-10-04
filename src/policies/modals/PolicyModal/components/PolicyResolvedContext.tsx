import { Stack, type StackProps } from "@mantine/core";
import { createContext, useContext } from "react";
import type { ResolvedPolicy, SourceInfo } from "../../../../core/types";

type PolicyResolvedValue = {
  target: SourceInfo;
  resolved?: ResolvedPolicy;
};

const PolicyResolvedContext = createContext<PolicyResolvedValue | undefined>(undefined);

export function PolicyResolvedStack({ target, resolved, ...stackProps }: PolicyResolvedValue & StackProps) {
  return (
    <PolicyResolvedContext.Provider value={{ target, resolved }}>
      <Stack {...stackProps} />
    </PolicyResolvedContext.Provider>
  );
}

export function usePolicyResolved() {
  return useContext(PolicyResolvedContext);
}

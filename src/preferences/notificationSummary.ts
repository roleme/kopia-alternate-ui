import type { NotificationProfile } from "../core/types";

export type SeverityName = "verbose" | "success" | "report" | "warning" | "error";

const SEVERITY_NAMES: Record<number, SeverityName> = {
  [-100]: "verbose",
  [-10]: "success",
  0: "report",
  10: "warning",
  20: "error"
};

export function severityName(severity: number): SeverityName | undefined {
  return SEVERITY_NAMES[severity];
}

export function endpointHost(endpoint: string): string {
  const trimmed = endpoint.trim();
  try {
    return new URL(trimmed).host || trimmed;
  } catch {
    return trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0];
  }
}

export function maskTail(value: string, visible = 4): string {
  if (value.length <= visible) return "…";
  return `…${value.slice(-visible)}`;
}

export function notificationDestination(profile: NotificationProfile): string {
  const config = profile.method.config;

  switch (profile.method.type) {
    case "email": {
      const { to } = config as { to?: string };
      return to?.trim() || "";
    }
    case "webhook": {
      const { endpoint } = config as { endpoint?: string };
      return endpoint ? endpointHost(endpoint) : "";
    }
    case "pushover": {
      const { userKey } = config as { userKey?: string };
      return userKey ? maskTail(userKey) : "";
    }
  }
}

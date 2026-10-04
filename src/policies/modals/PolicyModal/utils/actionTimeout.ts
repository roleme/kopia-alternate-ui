export const DEFAULT_ACTION_TIMEOUT = 300;

export function nextActionTimeout(script: string | undefined, currentTimeout: number | undefined) {
  if (script === undefined || script === "") return undefined;
  return currentTimeout ?? DEFAULT_ACTION_TIMEOUT;
}

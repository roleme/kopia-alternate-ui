export function pathAfterServerSwitch(pathname: string): string | undefined {
  if (pathname.startsWith("/snapshots/")) return "/snapshots";
  if (pathname.startsWith("/tasks/")) return "/tasks";
  return undefined;
}

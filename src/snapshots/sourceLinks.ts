import type { SourceInfo } from "../core/types";

export function sourceHistoryLink(source: SourceInfo) {
  return {
    pathname: "/snapshots/single-source",
    search: `?userName=${source.userName}&host=${source.host}&path=${encodeURIComponent(source.path)}`
  };
}

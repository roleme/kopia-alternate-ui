import sortBy from "lodash.sortby";

function valueAt(item: unknown, accessor: string): unknown {
  return accessor
    .split(".")
    .reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], item);
}

export function sortWithMissingLast<T>(items: T[], accessor: string, direction: "asc" | "desc"): T[] {
  const present = items.filter((item) => valueAt(item, accessor) != null);
  const missing = items.filter((item) => valueAt(item, accessor) == null);
  const sorted = sortBy(present, accessor) as T[];
  return [...(direction === "desc" ? sorted.reverse() : sorted), ...missing];
}

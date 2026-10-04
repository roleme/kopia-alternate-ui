import type { PolicyDefinition, SourceInfo } from "../../../../core/types";

export type ValueOrigin = "here" | "inherited" | "default";

export type FieldOrigin = {
  value: unknown;
  origin: ValueOrigin;
  definedIn?: SourceInfo;
};

export type ValueLabels = {
  yes: string;
  no: string;
};

export function isSourceInfo(value: unknown): value is SourceInfo {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.host === "string" && typeof v.userName === "string" && typeof v.path === "string";
}

export function isSameTarget(a: SourceInfo, b: SourceInfo) {
  return a.host === b.host && a.userName === b.userName && a.path === b.path;
}

export function isGlobalTarget(target: SourceInfo) {
  return !target.host && !target.userName && !target.path;
}

export function hasValue(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function getValueAt(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

export function getDefinitionAt(definition: PolicyDefinition | undefined, path: string): SourceInfo | undefined {
  let node: unknown = definition;
  for (const key of path.split(".")) {
    if (isSourceInfo(node)) return node;
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return isSourceInfo(node) ? node : undefined;
}

export function getValueOrigin(definedHere: boolean, definedIn: SourceInfo | undefined, target: SourceInfo) {
  if (definedHere) return "here";
  if (definedIn !== undefined && isSameTarget(definedIn, target) && isGlobalTarget(target)) return "default";
  return "inherited";
}

type DescribeInput = {
  effective?: unknown;
  definition?: PolicyDefinition;
  path: string;
  target: SourceInfo;
  definedValue?: unknown;
};

export function describeField({
  effective,
  definition,
  path,
  target,
  definedValue
}: DescribeInput): FieldOrigin | undefined {
  const definedHere = hasValue(definedValue);
  const value = definedHere ? definedValue : getValueAt(effective, path);
  if (!hasValue(value)) return undefined;
  const definedIn = getDefinitionAt(definition, path);
  return { value, origin: getValueOrigin(definedHere, definedIn, target), definedIn };
}

function formatItem(item: unknown, labels: ValueLabels): string {
  if (typeof item === "boolean") return item ? labels.yes : labels.no;
  if (typeof item === "object" && item !== null) {
    const tod = item as { hour?: unknown; min?: unknown };
    if (typeof tod.hour === "number" && typeof tod.min === "number") {
      return `${String(tod.hour).padStart(2, "0")}:${String(tod.min).padStart(2, "0")}`;
    }
    return JSON.stringify(item);
  }
  return String(item);
}

export function formatValueSummary(value: unknown, labels: ValueLabels): string {
  if (Array.isArray(value)) return value.map((x) => formatItem(x, labels)).join(", ");
  if (typeof value === "string" && value.includes("\n")) {
    const lines = value.split("\n").filter((x) => x.trim() !== "");
    return lines.length > 1 ? `${lines[0]} …` : (lines[0] ?? "");
  }
  return formatItem(value, labels);
}

type OptionLike = { label?: string; value?: string };
type OptionGroupLike = { group: string; items: unknown[] };

export function findOptionLabel(data: unknown, value: unknown): string | undefined {
  if (!Array.isArray(data)) return undefined;
  const wanted = String(value);
  for (const entry of data) {
    if (typeof entry === "string") {
      if (entry === wanted) return entry;
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;
    if ("items" in entry) {
      const found = findOptionLabel((entry as OptionGroupLike).items, value);
      if (found !== undefined) return found;
      continue;
    }
    const option = entry as OptionLike;
    if (option.value === wanted) return option.label ?? wanted;
  }
  return undefined;
}

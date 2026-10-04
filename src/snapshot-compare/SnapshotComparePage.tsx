import { t } from "@lingui/core/macro";
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Code,
  Container,
  Group,
  type MantineColor,
  Paper,
  Chip,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconChevronRight, IconExclamationCircle, IconFolderOpen } from "@tabler/icons-react";
import dayjs from "dayjs";
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppContext } from "../core/context/AppContext";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { ErrorAlert } from "../core/ErrorAlert/ErrorAlert";
import useApiRequest from "../core/hooks/useApiRequest";
import IconWrapper from "../core/IconWrapper";
import { getFileIcon } from "../snapshot-directory/fileIcons";
import type { Snapshot, Snapshots, SourceInfo } from "../core/types";
import sizeDisplayName from "../utils/formatSize";
import { walkTrees, type WalkProgress, type WalkResult } from "./compareWalk";
import {
  compareEntries,
  emptyStats,
  entrySize as entrySizeOf,
  type DiffNode,
  type DiffStatus,
  type DiffStats
} from "./diffTree";
import { compactDiff, diffLines, looksLikeText, sniffsAsText, type DiffLine } from "./lineDiff";

type Filter = "all" | DiffStatus;
type SortMode = "delta" | "type" | "path";

type ContentDiffState =
  | { state: "loading" }
  | { state: "binary" }
  | { state: "too-large" }
  | { state: "error" }
  | { state: "text"; lines: DiffLine[]; added: number; removed: number };

const MAX_DIFF_BYTES = 2 * 1024 * 1024;

const STATUS_COLOR: Record<DiffStatus, MantineColor> = {
  added: "green.6",
  removed: "red.6",
  modified: "blue.6",
  touched: "gray.6",
  error: "yellow.6"
};

const STATUS_GLYPH: Record<DiffStatus, string> = {
  added: "+",
  removed: "−",
  modified: "±",
  touched: "~",
  error: "!"
};

function nodeDelta(node: DiffNode): number {
  return node.agg ? node.agg.delta : node.delta;
}

function signedSize(value: number, base2: boolean): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${sizeDisplayName(Math.abs(value), base2)}`;
}

function sizePair(from: number, to: number, base2: boolean): [string, string] {
  const base = base2 ? 1024 : 1000;
  const prefixes = base2 ? ["", "Ki", "Mi", "Gi", "Ti"] : ["", "K", "M", "G", "T"];
  const largest = Math.max(from, to);
  let unit = 0;
  while (unit < prefixes.length - 1 && largest / base ** (unit + 1) >= 1) unit += 1;
  if (unit === 0) return [`${from} B`, `${to} B`];
  const fmt = (value: number, decimals: number) => `${(value / base ** unit).toFixed(decimals)} ${prefixes[unit]}B`;
  for (let decimals = 1; decimals <= 3; decimals++) {
    if (fmt(from, decimals) !== fmt(to, decimals)) return [fmt(from, decimals), fmt(to, decimals)];
  }
  return [fmt(from, 3), fmt(to, 3)];
}

function matchesFilter(node: DiffNode, filter: Filter, query: string): boolean {
  const shown = filter === "all" ? node.status !== "touched" : node.status === filter;
  if (shown && node.path.toLowerCase().includes(query)) {
    return true;
  }
  return node.children?.some((c) => matchesFilter(c, filter, query)) ?? false;
}

function keepMatching(nodes: DiffNode[], filter: Filter, query: string): DiffNode[] {
  return (nodes ?? []).filter((n) => matchesFilter(n, filter, query));
}

/** Counts rendered rows under a filter: ancestors of matches render, their
 * non-matching children do not — the tree prunes at every level. */
function countDisplayed(nodes: DiffNode[], filter: Filter, query: string): number {
  let total = 0;
  for (const node of keepMatching(nodes, filter, query)) {
    total += 1;
    if (node.children) total += countDisplayed(node.children, filter, query);
  }
  return total;
}

const TYPE_ORDER: Record<DiffStatus, number> = { added: 0, modified: 1, removed: 2, touched: 3, error: 4 };

function sortNodes(nodes: DiffNode[], sort: SortMode): DiffNode[] {
  const sorted = [...nodes];
  if (sort === "path") {
    sorted.sort((a, b) => a.path.localeCompare(b.path));
  } else if (sort === "type") {
    sorted.sort(
      (a, b) =>
        TYPE_ORDER[a.status] - TYPE_ORDER[b.status] ||
        Math.abs(nodeDelta(b)) - Math.abs(nodeDelta(a)) ||
        a.path.localeCompare(b.path)
    );
  } else {
    // signed: growth first, shrinkage last (+8, +7, 0, -6, -8)
    sorted.sort((a, b) => nodeDelta(b) - nodeDelta(a) || a.path.localeCompare(b.path));
  }
  return sorted;
}

function countFor(stats: DiffStats, status: DiffStatus): number {
  switch (status) {
    case "added":
      return stats.filesAdded;
    case "removed":
      return stats.filesRemoved;
    case "modified":
      return stats.filesModified;
    case "touched":
      return stats.filesTouched;
    default:
      return stats.errors;
  }
}

function pillLabel(status: DiffStatus): string {
  switch (status) {
    case "added":
      return t`added`;
    case "removed":
      return t`removed`;
    case "modified":
      return t`modified`;
    case "touched":
      return t`touched`;
    default:
      return t`errors`;
  }
}

function SnapshotComparePage() {
  const { kopiaService } = useServerInstanceContext();
  const { bytesStringBase2 } = useAppContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sourceInfo: SourceInfo = useMemo(
    () => ({
      host: searchParams.get("host") as string,
      userName: searchParams.get("userName") as string,
      path: searchParams.get("path") as string
    }),
    [searchParams]
  );
  const paramA = searchParams.get("a");
  const paramB = searchParams.get("b");

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [result, setResult] = useState<WalkResult>();
  const [progress, setProgress] = useState<WalkProgress>();
  const [walkError, setWalkError] = useState<string>();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("delta");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Set<string>>(new Set());
  const [sniffs, setSniffs] = useState<Record<string, "text" | "binary">>({});
  const sniffing = useRef<Set<string>>(new Set());
  const [lazyChildren, setLazyChildren] = useState<Record<string, DiffNode[] | "loading" | "error">>({});
  const [hiddenDiffs, setHiddenDiffs] = useState<Set<string>>(new Set());
  const [contentDiffs, setContentDiffs] = useState<Record<string, ContentDiffState>>({});
  const [retryTick, setRetryTick] = useState(0);
  const runIdRef = useRef(0);

  const { error, execute } = useApiRequest({
    action: () => kopiaService.getSnapshot(sourceInfo),
    onReturn(resp: Snapshots) {
      setSnapshots(resp.snapshots ?? []);
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: need-to-fix-later
  useEffect(() => {
    execute(undefined, "loading");
  }, []);

  useEffect(() => {
    return () => {
      runIdRef.current++;
    };
  }, []);

  const fetchManifest = async (oid: string) => {
    const resp = await kopiaService.getObjects(oid);
    if (resp.isError || !resp.data) throw new Error("object fetch failed");
    return resp.data;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: need-to-fix-later
  useEffect(() => {
    if (!paramA || !paramB || paramA === paramB) {
      setResult(undefined);
      setProgress(undefined);
      runIdRef.current++;
      return;
    }
    const runId = ++runIdRef.current;
    const stale = () => runIdRef.current !== runId;
    setResult(undefined);
    setProgress(undefined);
    setWalkError(undefined);
    setExpanded(new Set());
    setCollapsed(new Set());
    setSniffs({});
    sniffing.current.clear();
    setLazyChildren({});
    setDetails(new Set());
    setHiddenDiffs(new Set());
    setContentDiffs({});
    (async () => {
      try {
        const [manifestA, manifestB] = await Promise.all([fetchManifest(paramA), fetchManifest(paramB)]);
        const walk = await walkTrees(manifestA, manifestB, fetchManifest, {
          concurrency: 6,
          onProgress: (p) => {
            if (!stale()) setProgress(p);
          },
          isCancelled: stale
        });
        if (!stale()) setResult(walk);
      } catch (err) {
        if (!stale() && (err as Error).name !== "AbortError") {
          setWalkError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
  }, [paramA, paramB, retryTick]);

  const snapshotById = useMemo(() => new Map(snapshots.map((s) => [s.rootID, s])), [snapshots]);
  const snapshotA = paramA ? snapshotById.get(paramA) : undefined;
  const snapshotB = paramB ? snapshotById.get(paramB) : undefined;

  const pairTime = (snap: Snapshot) => dayjs(snap.startTime).format("YYYY-MM-DD HH:mm");
  const pairEpoch = (snap: Snapshot) => `epoch ${dayjs(snap.startTime).unix()}`;
  const pairLabel = (snap: Snapshot) => `${pairTime(snap)} · ${sizeDisplayName(snap.summary.size, bytesStringBase2)}`;

  const loadContentDiff = async (node: DiffNode) => {
    if (!node.a || !node.b) return;
    if ((node.a.size ?? 0) > MAX_DIFF_BYTES || (node.b.size ?? 0) > MAX_DIFF_BYTES) {
      setContentDiffs((prev) => ({ ...prev, [node.id]: { state: "too-large" } }));
      return;
    }
    setContentDiffs((prev) => ({ ...prev, [node.id]: { state: "loading" } }));
    try {
      const [bufA, bufB] = await Promise.all([
        kopiaService.getObjectBuffer(node.a.obj),
        kopiaService.getObjectBuffer(node.b.obj)
      ]);
      if (bufA.isError || !bufA.data || bufB.isError || !bufB.data) {
        setContentDiffs((prev) => ({ ...prev, [node.id]: { state: "error" } }));
        return;
      }
      const textA = looksLikeText(bufA.data);
      const textB = looksLikeText(bufB.data);
      if (textA === null || textB === null) {
        setContentDiffs((prev) => ({ ...prev, [node.id]: { state: "binary" } }));
        return;
      }
      const lines = diffLines(textA, textB);
      if (lines === null) {
        setContentDiffs((prev) => ({ ...prev, [node.id]: { state: "too-large" } }));
        return;
      }
      const added = lines.filter((l) => l.type === "add").length;
      const removed = lines.filter((l) => l.type === "del").length;
      setContentDiffs((prev) => ({
        ...prev,
        [node.id]: { state: "text", lines: compactDiff(lines), added, removed }
      }));
    } catch {
      setContentDiffs((prev) => ({ ...prev, [node.id]: { state: "error" } }));
    }
  };

  const stats = result?.stats;
  const walking = !result && !walkError && Boolean(paramA && paramB && paramA !== paramB);
  const narrow = filter !== "all" || query.trim() !== "";

  const visibleRoots = useMemo(() => {
    if (!result) return [];
    return keepMatching(result.roots, filter, query.trim().toLowerCase());
  }, [result, filter, query]);

  const visibleCount = useMemo(
    () => (result ? countDisplayed(result.roots, filter, query.trim().toLowerCase()) : 0),
    [result, filter, query]
  );
  const totalCount = useMemo(
    () => (result ? countDisplayed(result.roots, filter === "touched" ? "touched" : "all", "") : 0),
    [result, filter]
  );

  const flip = (prev: Set<string>, id: string) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const isOpen = (node: DiffNode) =>
    expanded.has(node.id) || (narrow && (node.status === "modified" || node.status === "touched") && !collapsed.has(node.id));

  useEffect(() => {
    if (!result) return;
    const visit = (nodes: DiffNode[]) => {
      for (const node of nodes) {
        const { a, b } = node;
        if (
          !node.isDir &&
          node.status === "modified" &&
          a &&
          b &&
          a.obj !== b.obj &&
          !node.typeChanged &&
          !sniffing.current.has(node.id)
        ) {
          sniffing.current.add(node.id);
          void (async () => {
            const [headA, headB] = await Promise.all([
              kopiaService.getObjectHead(a.obj, 512),
              kopiaService.getObjectHead(b.obj, 512)
            ]);
            const text =
              !headA.isError && headA.data && !headB.isError && headB.data
                ? sniffsAsText(headA.data) && sniffsAsText(headB.data)
                : false;
            setSniffs((prev) => ({ ...prev, [node.id]: text ? "text" : "binary" }));
          })();
        }
        if (node.isDir && node.children && isOpen(node)) visit(node.children);
      }
    };
    visit(result.roots);
  });

  const loadOneSided = async (node: DiffNode) => {
    const entry = node.a ?? node.b;
    if (!entry) return;
    setLazyChildren((prev) => ({ ...prev, [node.id]: "loading" }));
    const resp = await kopiaService.getObjects(entry.obj);
    if (resp.isError || !resp.data) {
      setLazyChildren((prev) => ({ ...prev, [node.id]: "error" }));
      return;
    }
    const entries = resp.data.entries ?? [];
    const added = node.status === "added";
    const children = compareEntries(added ? [] : entries, added ? entries : [], node.path, emptyStats());
    setLazyChildren((prev) => ({ ...prev, [node.id]: children }));
  };

  const toggle = (node: DiffNode) => {
    if (!node.isDir) {
      setDetails((prev) => flip(prev, node.id));
      return;
    }
    if (isOpen(node)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
      setCollapsed((prev) => new Set(prev).add(node.id));
    } else {
      setExpanded((prev) => new Set(prev).add(node.id));
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
      if (node.oneSided && !node.children && !lazyChildren[node.id]) void loadOneSided(node);
    }
  };

  const collapseAll = () => {
    const dirs: string[] = [];
    const collect = (nodes: DiffNode[]) => {
      for (const node of nodes) {
        if (node.isDir && node.children) {
          dirs.push(node.id);
          collect(node.children);
        }
      }
    };
    collect(result?.roots ?? []);
    setExpanded(new Set());
    setCollapsed(new Set(dirs));
    setDetails(new Set());
  };

  const renderContentDiff = (node: DiffNode): ReactNode => {
    const current = contentDiffs[node.id];
    if (!current) {
      return (
        <Button variant="subtle" size="compact-xs" onClick={() => loadContentDiff(node)}>
          {t`Show content diff`}
        </Button>
      );
    }
    if (current.state === "loading") {
      return (
        <Button variant="subtle" size="compact-xs" loading>
          {t`Show content diff`}
        </Button>
      );
    }
    if (current.state === "error") {
      return (
        <Text fz="xs" c="red.6">
          {t`Content could not be loaded.`}
        </Text>
      );
    }
    if (current.state !== "text") return null;
    const hidden = hiddenDiffs.has(node.id);
    return (
      <Stack gap={0} mt={4}>
        <Group
          gap={4}
          wrap="nowrap"
          mb={2}
          style={{ cursor: "pointer" }}
          onClick={() => setHiddenDiffs((prev) => flip(prev, node.id))}
        >
          <IconChevronRight
            size={12}
            style={{ transform: hidden ? "none" : "rotate(90deg)", transition: "transform 120ms ease", flexShrink: 0 }}
          />
          <Text fz="xs" c="dimmed">
            {t`+${current.added} −${current.removed} lines`}
          </Text>
        </Group>
        {!hidden && (
          <Paper withBorder radius="sm" style={{ maxHeight: 260, overflowY: "auto" }}>
            {current.lines.map((line, idx) => (
              <Group
                key={idx}
                gap="xs"
                wrap="nowrap"
                px={6}
                style={{
                  background:
                    line.type === "add"
                      ? "var(--mantine-color-green-light)"
                      : line.type === "del"
                        ? "var(--mantine-color-red-light)"
                        : undefined,
                  minHeight: 20
                }}
              >
                <Text
                  ff="monospace"
                  fz="xs"
                  w={10}
                  c={line.type === "add" ? "green.6" : line.type === "del" ? "red.6" : "dimmed"}
                >
                  {line.type === "add" ? "+" : line.type === "del" ? "−" : ""}
                </Text>
                <Text ff="monospace" fz="xs" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {line.text || " "}
                </Text>
              </Group>
            ))}
          </Paper>
        )}
      </Stack>
    );
  };

  const changeRows = (node: DiffNode): { label: string; content: ReactNode }[] => {
    const { a, b } = node;
    if (!a || !b || node.isDir) return [];
    const rows: { label: string; content: ReactNode }[] = [];
    const change = (from: string, to: string) => (
      <Code fz="xs" fw={600} style={{ whiteSpace: "nowrap" }}>
        {`${from} → ${to}`}
      </Code>
    );
    const sizeA = entrySizeOf(a);
    const sizeB = entrySizeOf(b);
    if (sizeA !== sizeB) {
      const [from, to] = sizePair(sizeA, sizeB, bytesStringBase2);
      rows.push({ label: "size", content: change(from, to) });
    }
    if (a.mode !== b.mode) rows.push({ label: "mode", content: change(a.mode, b.mode) });
    if (a.uid !== b.uid || a.gid !== b.gid) {
      const owner = (e: typeof a) => `${e.uid ?? "?"}:${e.gid ?? "?"}`;
      rows.push({ label: "owner", content: change(owner(a), owner(b)) });
    }
    if (a.mtime !== b.mtime) {
      const minutes = "YYYY-MM-DD HH:mm";
      const sameMinute = dayjs(a.mtime).format(minutes) === dayjs(b.mtime).format(minutes);
      const format = sameMinute ? "YYYY-MM-DD HH:mm:ss" : minutes;
      rows.push({ label: "date", content: change(dayjs(a.mtime).format(format), dayjs(b.mtime).format(format)) });
    }
    const loaded = contentDiffs[node.id];
    const nothingToShow =
      loaded?.state === "binary" ||
      loaded?.state === "too-large" ||
      (loaded?.state === "text" && loaded.added === 0 && loaded.removed === 0);
    const diffable =
      sniffs[node.id] === "text" &&
      !nothingToShow &&
      !node.typeChanged &&
      a.obj !== b.obj &&
      !(sizeA === 0 && sizeB === 0) &&
      sizeA <= MAX_DIFF_BYTES &&
      sizeB <= MAX_DIFF_BYTES;
    if (diffable) rows.push({ label: "content", content: renderContentDiff(node) });
    return rows;
  };

  const renderChanges = (rows: { label: string; content: ReactNode }[]): ReactNode => (
    <Stack gap={2}>
      {rows.map((row) => (
        <Group key={row.label} gap="xs" wrap="nowrap" align="flex-start">
          <Text fz="xs" c="dimmed" w={70} style={{ flexShrink: 0 }}>
            {row.label}
          </Text>
          <Box style={{ flex: 1, minWidth: 0 }}>{row.content}</Box>
        </Group>
      ))}
    </Stack>
  );

  const childrenOf = (node: DiffNode): DiffNode[] | undefined => {
    if (node.children) return node.children;
    const lazy = lazyChildren[node.id];
    return Array.isArray(lazy) ? lazy : undefined;
  };

  const renderNode = (node: DiffNode, depth: number): ReactNode => {
    const open = isOpen(node);
    const rows = node.status === "modified" || node.status === "touched" ? changeRows(node) : [];
    const expandable = node.isDir ? node.status !== "error" : rows.length > 0;
    const showDetail = expandable && !node.isDir && details.has(node.id);
    const interactive = expandable
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-expanded": node.isDir ? open : showDetail,
          onClick: () => toggle(node),
          onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(node);
            }
          }
        }
      : {};
    const delta = nodeDelta(node);
    return (
      <Box key={node.id}>
        <Group
          className="cmp-row"
          gap="xs"
          wrap="nowrap"
          px="xs"
          py={6}
          ml={depth * 22}
          {...interactive}
          style={{
            cursor: expandable ? "pointer" : undefined,
            borderRadius: 4,
            background: open || showDetail ? "var(--mantine-color-gray-1)" : undefined
          }}
        >
          <Text ff="monospace" fw={700} fz="sm" c={STATUS_COLOR[node.status]} style={{ width: 14, flexShrink: 0 }}>
            {STATUS_GLYPH[node.status]}
          </Text>
          {expandable ? (
            <IconChevronRight
              size={13}
              style={{
                transform: open || showDetail ? "rotate(90deg)" : "none",
                transition: "transform 120ms ease",
                flexShrink: 0
              }}
            />
          ) : (
            <Box w={13} style={{ flexShrink: 0 }} />
          )}
          {node.isDir ? (
            <IconWrapper icon={IconFolderOpen} color="yellow" size={16} />
          ) : (
            <IconWrapper icon={getFileIcon(node.name)} color="blue" size={16} />
          )}
          <Text
            ff="monospace"
            fz="sm"
            c={node.status === "added" || node.status === "removed" ? STATUS_COLOR[node.status] : undefined}
            style={{ flex: 1, minWidth: 0 }}
            truncate="end"
          >
            {node.name}
            {node.typeChanged && (
              <Text component="span" inherit c="yellow.6">
                {` · ${t`type changed`}`}
              </Text>
            )}
          </Text>
          {node.isDir && node.oneSided && (
            <Text ff="monospace" fz="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {t`${node.oneSided.files} files, ${node.oneSided.dirs} dirs`}
            </Text>
          )}
          <Text
            ff="monospace"
            fz="sm"
            ta="right"
            c={
              node.isDir && node.status === "error"
                ? "yellow.6"
                : delta > 0
                  ? "green.6"
                  : delta < 0
                    ? "red.6"
                    : "dimmed"
            }
            style={{ minWidth: 90, flexShrink: 0 }}
          >
            {node.isDir && node.status === "error"
              ? t`couldn't read`
              : node.status === "touched"
                ? ""
                : node.isDir && !node.agg && !node.oneSided
                  ? "…"
                  : signedSize(delta, bytesStringBase2)}
          </Text>
        </Group>
        {showDetail && (
          <Paper withBorder ml={depth * 22 + 30} mb={4} p="xs" radius="sm">
            {renderChanges(rows)}
          </Paper>
        )}
        {node.isDir && open && childrenOf(node) && (
          <Box>
            {sortNodes(keepMatching(childrenOf(node) ?? [], filter, query.trim().toLowerCase()), sort).map((child) =>
              renderNode(child, depth + 1)
            )}
          </Box>
        )}
        {node.isDir && open && lazyChildren[node.id] === "loading" && (
          <Text fz="xs" c="dimmed" ml={(depth + 1) * 22 + 44} py={4}>
            {t`Loading…`}
          </Text>
        )}
        {node.isDir && open && lazyChildren[node.id] === "error" && (
          <Text fz="xs" c="yellow.6" ml={(depth + 1) * 22 + 44} py={4}>
            {t`couldn't read`}
          </Text>
        )}
      </Box>
    );
  };

  return (
    <Container fluid>
      <Stack>
        <Group>
          <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Stack gap={0}>
            <Title order={1}>{t`Compare snapshots`}</Title>
            <Text size="sm" c="dimmed">
              {sourceInfo.path}
            </Text>
          </Stack>
        </Group>

        {(snapshotA || snapshotB) && (
          <Stack gap={2} miw={0}>
            {snapshotA && (
              <Group gap="sm" wrap="nowrap">
                <Text fz="xs" c="dimmed" w={52} style={{ flexShrink: 0 }}>
                  {t`before`}
                </Text>
                <Text
                  ff="monospace"
                  fz="sm"
                  truncate="end"
                  title={`${pairLabel(snapshotA)}${snapshotA.description ? ` · ${snapshotA.description}` : ""} · ${pairEpoch(snapshotA)}`}
                >
                  {pairLabel(snapshotA)}
                  {snapshotA.description && ` · ${snapshotA.description}`}
                </Text>
              </Group>
            )}
            {snapshotB && (
              <Group gap="sm" wrap="nowrap">
                <Text fz="xs" c="dimmed" w={52} style={{ flexShrink: 0 }}>
                  {t`after`}
                </Text>
                <Text
                  ff="monospace"
                  fz="sm"
                  truncate="end"
                  title={`${pairLabel(snapshotB)}${snapshotB.description ? ` · ${snapshotB.description}` : ""} · ${pairEpoch(snapshotB)}`}
                >
                  {pairLabel(snapshotB)}
                  {snapshotB.description && ` · ${snapshotB.description}`}
                </Text>
              </Group>
            )}
          </Stack>
        )}

        <ErrorAlert error={error} />
        {walkError && <ErrorAlert error={{ message: walkError } as never} />}

        {(!paramA || !paramB) && (
          <Alert color="blue" variant="light">
            {t`No snapshot pair selected \u2014 open the snapshot list and use the compare action on a row.`}
          </Alert>
        )}
        {paramA && paramB && paramA === paramB && (
          <Alert color="blue" variant="light">
            {t`Pick two different snapshots to compare.`}
          </Alert>
        )}

        {walking && progress && (
          <Group gap="sm" wrap="nowrap">
            <Text fz="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {t`Reading changed folders`}: {progress.done}
              {progress.pending > 0 ? ` / ${progress.done + progress.pending}` : ""}
            </Text>
            <Progress
              value={
                progress.pending + progress.done > 0 ? (progress.done / (progress.done + progress.pending)) * 100 : 100
              }
              size="sm"
              style={{ flex: 1 }}
            />
          </Group>
        )}

        {stats && stats.errors === 0 && stats.delta === 0 && stats.filesTouched === 0 && visibleRoots.length === 0 && (
          <Alert color="green" icon={<IconCheck size={16} />} variant="light">
            {t`The selected snapshots are identical — nothing was added, removed or modified.`}
          </Alert>
        )}

        {stats && (stats.errors > 0 || stats.delta !== 0 || stats.filesTouched > 0 || visibleRoots.length > 0) && (
          <>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" align="center" gap="md" wrap="wrap">
                <Text
                  ff="monospace"
                  fz="xl"
                  fw={500}
                  title={stats.errors > 0 ? t`Lower bound \u2014 some folders could not be read` : undefined}
                  c={stats.delta > 0 ? "green.6" : stats.delta < 0 ? "red.6" : undefined}
                >
                  {stats.errors > 0 ? "\u2265 " : ""}
                  {signedSize(stats.delta, bytesStringBase2)}
                </Text>
                <Stack gap={6} align="flex-end">
                  {(["added", "removed", "modified", "touched"] as DiffStatus[]).map((key) => {
                    const count = countFor(stats, key);
                    if (count === 0) return null;
                    if (key === "touched") {
                      return (
                        <Chip key={key} value={key} size="xs" onChange={(checked) => setFilter(checked ? key : "all")}>
                          <span title={t`Content unchanged \u2014 only the timestamp, permissions or owner differ`}>
                            {`${count} ${pillLabel(key)}`}
                          </span>
                        </Chip>
                      );
                    }
                    const value =
                      key === "added"
                        ? stats.bytesAdded
                        : key === "removed"
                          ? -stats.bytesRemoved
                          : stats.modifiedDelta;
                    const color =
                      key === "added" || (key === "modified" && value > 0)
                        ? "green.6"
                        : key === "removed" || (key === "modified" && value < 0)
                          ? "red.6"
                          : "dimmed";
                    return (
                      <Chip key={key} value={key} size="xs" onChange={(checked) => setFilter(checked ? key : "all")}>
                        {`${count} ${pillLabel(key)} \u00b7 `}
                        <Text component="span" inherit ff="monospace" c={color}>
                          {signedSize(value, bytesStringBase2)}
                        </Text>
                      </Chip>
                    );
                  })}
                </Stack>
              </Group>
              {stats.errors > 0 && (
                <Text fz="xs" c="yellow.6" mt="xs">
                  {stats.errors === 1
                    ? t`Partial \u2014 1 folder could not be read`
                    : t`Partial \u2014 ${stats.errors} folders could not be read`}
                </Text>
              )}
            </Paper>

            {stats.errors > 0 && (
              <Alert
                color="yellow"
                icon={<IconExclamationCircle size={16} />}
                variant="light"
                title={
                  stats.errors === 1 ? t`1 folder could not be read` : t`${stats.errors} folders could not be read`
                }
              >
                <Group gap="xs">
                  <span>{t`Results are partial \u2014 counts cover what was read.`}</span>
                  <Anchor
                    fz="sm"
                    onClick={() => setRetryTick((n) => n + 1)}
                    style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {t`Retry`}
                  </Anchor>
                </Group>
              </Alert>
            )}

            <Group gap="sm">
              <TextInput
                placeholder={t`Filter by path…`}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                style={{ width: 240 }}
              />
              <Select
                data={[
                  { value: "delta", label: t`Sort: size delta` },
                  { value: "type", label: t`Sort: added, modified, removed` },
                  { value: "path", label: t`Sort: path` }
                ]}
                value={sort}
                onChange={(v) => setSort((v as SortMode) ?? "delta")}
                w={250}
              />
              {(expanded.size > 0 || details.size > 0 || narrow) && (
                <Button variant="subtle" size="xs" ml="auto" onClick={collapseAll}>
                  {t`Collapse all`}
                </Button>
              )}
            </Group>

            {narrow && (
              <Text fz="xs" c="dimmed">
                {t`Showing ${visibleCount} of ${totalCount} changed paths`}{" "}
                <Anchor
                  fz="xs"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                >
                  {t`Clear`}
                </Anchor>
              </Text>
            )}

            <style>{`.cmp-row:hover{background:var(--mantine-color-gray-1)}.cmp-row:focus-visible{outline:2px solid var(--mantine-color-blue-4);outline-offset:-2px}`}</style>
            <Paper withBorder radius="md" style={{ maxHeight: 480, overflowY: "auto" }} p="xs">
              {visibleRoots.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  {t`No changed paths match the current filter.`}
                </Text>
              ) : (
                sortNodes(visibleRoots, sort).map((node) => renderNode(node, 0))
              )}
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  );
}

export default SnapshotComparePage;

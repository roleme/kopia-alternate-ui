import { t } from "@lingui/core/macro";
import type { MantineColor } from "@mantine/core";
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Code,
  Container,
  Group,
  Paper,
  Pill,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconDownload,
  IconExclamationCircle,
  IconFile,
  IconFolder
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppContext } from "../core/context/AppContext";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { ErrorAlert } from "../core/ErrorAlert/ErrorAlert";
import useApiRequest from "../core/hooks/useApiRequest";
import type { Snapshot, Snapshots, SourceInfo } from "../core/types";
import sizeDisplayName from "../utils/formatSize";
import { walkTrees, type WalkProgress, type WalkResult } from "./compareWalk";
import { entrySize as entrySizeOf, isDirectoryEntry, type DiffNode, type DiffStatus, type DiffStats } from "./diffTree";
import { compactDiff, diffLines, looksLikeText, type DiffLine } from "./lineDiff";

type Filter = "all" | DiffStatus;
type SortMode = "delta" | "path" | "status";

type ContentDiffState =
  | { state: "loading" }
  | { state: "binary" }
  | { state: "too-large" }
  | { state: "error" }
  | { state: "text"; lines: DiffLine[]; added: number; removed: number };

const STATUS_ORDER: Record<DiffStatus, number> = {
  added: 0,
  removed: 1,
  modified: 2,
  metadata: 3,
  error: 4
};

const STATUS_COLOR: Record<DiffStatus, MantineColor> = {
  added: "green.6",
  removed: "red.6",
  modified: "blue.6",
  metadata: "gray.5",
  error: "yellow.6"
};

const STATUS_GLYPH: Record<DiffStatus, string> = {
  added: "+",
  removed: "−",
  modified: "±",
  metadata: "≈",
  error: "!"
};

function nodeDelta(node: DiffNode): number {
  return node.agg ? node.agg.delta : node.delta;
}

function signedSize(value: number, base2: boolean): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${sizeDisplayName(Math.abs(value), base2)}`;
}

function countNodes(nodes: DiffNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node.children) total += countNodes(node.children);
  }
  return total;
}

function matchesFilter(node: DiffNode, filter: Filter, query: string): boolean {
  if ((filter === "all" || node.status === filter) && node.path.toLowerCase().includes(query)) {
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

function sortNodes(nodes: DiffNode[], sort: SortMode): DiffNode[] {
  const sorted = [...nodes];
  if (sort === "path") {
    sorted.sort((a, b) => a.path.localeCompare(b.path));
  } else if (sort === "status") {
    sorted.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.path.localeCompare(b.path));
  } else {
    sorted.sort((a, b) => Math.abs(nodeDelta(b)) - Math.abs(nodeDelta(a)) || a.path.localeCompare(b.path));
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
    case "metadata":
      return stats.filesMetadata;
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
    case "metadata":
      return t`metadata`;
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
  const [details, setDetails] = useState<Set<string>>(new Set());
  const [contentDiffs, setContentDiffs] = useState<Record<string, ContentDiffState>>({});
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
    setDetails(new Set());
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
  }, [paramA, paramB]);

  const snapshotById = useMemo(() => new Map(snapshots.map((s) => [s.rootID, s])), [snapshots]);
  const snapshotA = paramA ? snapshotById.get(paramA) : undefined;
  const snapshotB = paramB ? snapshotById.get(paramB) : undefined;

  const pairLabel = (snap: Snapshot) =>
    `${new Date(snap.startTime).toLocaleString()} · ${sizeDisplayName(snap.summary.size, bytesStringBase2)}`;

  const loadContentDiff = async (node: DiffNode) => {
    if (!node.a || !node.b) return;
    const maxBytes = 2 * 1024 * 1024;
    if ((node.a.size ?? 0) > maxBytes || (node.b.size ?? 0) > maxBytes) {
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
  const totalASize = snapshotA?.summary?.size ?? 0;
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
  const totalCount = useMemo(() => (result ? countNodes(result.roots) : 0), [result]);

  const toggle = (id: string, isDir: boolean) => {
    if (isDir) {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setDetails((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
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
    if (current.state === "binary") {
      return (
        <Text fz="xs" c="dimmed">
          {t`Not a text file — content diff is not available.`}
        </Text>
      );
    }
    if (current.state === "too-large") {
      return (
        <Text fz="xs" c="dimmed">
          {t`File is too large to diff in the browser.`}
        </Text>
      );
    }
    if (current.state === "error") {
      return (
        <Text fz="xs" c="red.6">
          {t`Content could not be loaded.`}
        </Text>
      );
    }
    if (current.added === 0 && current.removed === 0) {
      return (
        <Text fz="xs" c="dimmed">
          {t`Text is identical — only metadata differs.`}
        </Text>
      );
    }
    return (
      <Stack gap={0} mt={4}>
        <Text fz="xs" c="dimmed" mb={2}>
          {t`+${current.added} −${current.removed} lines`}
        </Text>
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
      </Stack>
    );
  };

  const renderNode = (node: DiffNode, depth: number): ReactNode => {
    const open = expanded.has(node.id) || (narrow && node.status === "modified");
    const showDetail = !node.isDir && details.has(node.id);
    const aggParts: string[] = [];
    if (node.agg) {
      if (node.agg.filesAdded) aggParts.push(`+${node.agg.filesAdded}`);
      if (node.agg.filesRemoved) aggParts.push(`−${node.agg.filesRemoved}`);
      if (node.agg.filesModified) aggParts.push(`±${node.agg.filesModified}`);
      if (node.agg.filesMetadata) aggParts.push(`≈${node.agg.filesMetadata}`);
      if (node.agg.errors) aggParts.push(`!${node.agg.errors}`);
    }
    const delta = nodeDelta(node);
    return (
      <Box key={node.id}>
        <Group
          gap="xs"
          wrap="nowrap"
          px="xs"
          py={4}
          ml={depth * 22}
          style={{ cursor: "pointer", borderRadius: 4 }}
          onClick={() => toggle(node.id, node.isDir)}
        >
          <Text ff="monospace" fw={700} fz="sm" c={STATUS_COLOR[node.status]} style={{ width: 14, flexShrink: 0 }}>
            {STATUS_GLYPH[node.status]}
          </Text>
          {node.isDir && node.status !== "error" ? (
            <IconChevronRight
              size={13}
              style={{
                transform: open ? "rotate(90deg)" : "none",
                transition: "transform 120ms ease",
                flexShrink: 0
              }}
            />
          ) : (
            <Box w={13} style={{ flexShrink: 0 }} />
          )}
          {node.isDir ? (
            <IconFolder size={14} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
          ) : (
            <IconFile size={14} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
          )}
          <Text ff="monospace" fz="sm" style={{ flex: 1, minWidth: 0 }} truncate="end">
            {node.name}
            {node.typeChanged && (
              <Text component="span" inherit c="yellow.6">
                {` · ${t`type changed`}`}
              </Text>
            )}
          </Text>
          {node.isDir && node.agg && aggParts.length > 0 && (
            <Text ff="monospace" fz="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {aggParts.join(" ")}
            </Text>
          )}
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
              : node.isDir && !node.agg
                ? "…"
                : signedSize(delta, bytesStringBase2)}
          </Text>
        </Group>
        {showDetail && (
          <Paper withBorder ml={depth * 22 + 30} mb={4} p="xs" radius="sm">
            <Stack gap={2}>
              {node.status === "metadata" &&
                node.metaChanges?.map((change) => (
                  <Group key={change.field} gap="xs" wrap="nowrap">
                    <Text fz="xs" c="dimmed" w={70}>
                      {change.field}
                    </Text>
                    <Code fz="xs" style={{ whiteSpace: "nowrap" }}>
                      {change.from} → {change.to}
                    </Code>
                  </Group>
                ))}
              {node.a && (
                <Group gap="xs" wrap="nowrap">
                  <Text fz="xs" c="dimmed" w={70}>
                    {t`Before`}
                  </Text>
                  <Code fz="xs" style={{ whiteSpace: "nowrap" }}>
                    {sizeDisplayName(entrySizeOf(node.a), bytesStringBase2)} · {new Date(node.a.mtime).toLocaleString()}
                  </Code>
                </Group>
              )}
              {node.b && (
                <Group gap="xs" wrap="nowrap">
                  <Text fz="xs" c="dimmed" w={70}>
                    {t`After`}
                  </Text>
                  <Code fz="xs" style={{ whiteSpace: "nowrap" }}>
                    {sizeDisplayName(entrySizeOf(node.b), bytesStringBase2)} · {new Date(node.b.mtime).toLocaleString()}
                  </Code>
                </Group>
              )}
              {(node.a || node.b) && (
                <Group gap="xs" wrap="nowrap">
                  <Text fz="xs" c="dimmed" w={70}>
                    {t`Objects`}
                  </Text>
                  <Text
                    fz="xs"
                    ff="monospace"
                    c="dimmed"
                    truncate="end"
                    title={`${node.a?.obj ?? "—"} → ${node.b?.obj ?? "—"}`}
                  >
                    {node.a?.obj ?? "—"} → {node.b?.obj ?? "—"}
                  </Text>
                </Group>
              )}
              {node.b && !isDirectoryEntry(node.b) && (node.status === "added" || node.status === "modified") && (
                <Anchor
                  href={kopiaService.objectUrl(node.b.obj, node.b.name)}
                  fz="xs"
                  td="none"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Group gap={4} wrap="nowrap">
                    <IconDownload size={13} />
                    <span>{t`Download newer version`}</span>
                  </Group>
                </Anchor>
              )}
              {node.status === "modified" &&
                !node.isDir &&
                node.a &&
                node.b &&
                !node.typeChanged &&
                renderContentDiff(node)}
            </Stack>
          </Paper>
        )}
        {node.isDir && open && node.children && (
          <Box>
            {sortNodes(keepMatching(node.children, filter, query.trim().toLowerCase()), sort).map((child) =>
              renderNode(child, depth + 1)
            )}
          </Box>
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
          <Title order={1}>{t`Compare snapshots`}</Title>
        </Group>
        <Text c="dimmed" ff="monospace" fz="sm">
          {sourceInfo.path}
        </Text>

        {(snapshotA || snapshotB) && (
          <Group gap="sm" wrap="nowrap">
            {snapshotA && (
              <Text ff="monospace" fz="sm" truncate="end" maw={520}>
                {pairLabel(snapshotA)}
                {snapshotA.description && ` · ${snapshotA.description}`}
              </Text>
            )}
            {snapshotA && snapshotB && (
              <Text c="dimmed" fz="sm">
                →
              </Text>
            )}
            {snapshotB && (
              <Text ff="monospace" fz="sm" truncate="end" maw={520}>
                {pairLabel(snapshotB)}
                {snapshotB.description && ` · ${snapshotB.description}`}
              </Text>
            )}
          </Group>
        )}

        <ErrorAlert error={error} />
        {walkError && <ErrorAlert error={{ message: walkError } as never} />}

        {(!paramA || !paramB) && (
          <Alert color="blue" variant="light">
            {t`No snapshot pair selected — go back to the snapshot list, tick two snapshots and press Compare.`}
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

        {stats && stats.errors === 0 && stats.delta === 0 && visibleRoots.length === 0 && (
          <Alert color="green" icon={<IconCheck size={16} />} variant="light">
            {t`The selected snapshots are identical — nothing was added, removed or modified.`}
          </Alert>
        )}

        {stats && (stats.errors > 0 || stats.delta !== 0 || visibleRoots.length > 0) && (
          <>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" gap="md" wrap="nowrap" align="flex-start">
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Text ff="monospace" fz="xl" fw={500}>
                    {stats.errors > 0 ? "≥ " : ""}
                    {signedSize(stats.delta, bytesStringBase2)}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {sizeDisplayName(totalASize, bytesStringBase2)} →{" "}
                    {sizeDisplayName(totalASize + stats.delta, bytesStringBase2)}
                    {` · ${t`${sizeDisplayName(stats.bytesAdded, bytesStringBase2)} added, ${sizeDisplayName(
                      stats.bytesRemoved,
                      bytesStringBase2
                    )} removed`}`}
                    {stats.modifiedDelta !== 0 &&
                      `, ${signedSize(stats.modifiedDelta, bytesStringBase2)} ${t`in modified`}`}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {t`${stats.skippedDirs} identical subtrees (${stats.skippedFiles.toLocaleString()} files) resolved by content ID, never fetched`}
                  </Text>
                  {stats.errors > 0 && (
                    <Text fz="xs" c="yellow.6">
                      {t`Partial — ${stats.errors} folders could not be read; counts cover what was read.`}
                    </Text>
                  )}
                </Stack>
                <Pill.Group style={{ flexShrink: 0 }}>
                  {(["added", "removed", "modified", "metadata"] as DiffStatus[]).map((key) => {
                    const count = countFor(stats, key);
                    if (count === 0 && key === "metadata") return null;
                    return (
                      <Pill
                        key={key}
                        onClick={() => setFilter(filter === key ? "all" : key)}
                        style={{
                          cursor: "pointer",
                          fontWeight: filter === key ? 700 : 400,
                          opacity: filter === "all" || filter === key ? 1 : 0.55
                        }}
                      >
                        {`${STATUS_GLYPH[key]} ${count} ${pillLabel(key)}`}
                      </Pill>
                    );
                  })}
                </Pill.Group>
              </Group>
            </Paper>

            {stats.errors > 0 && (
              <Alert color="yellow" icon={<IconExclamationCircle size={16} />} variant="light">
                {t`${stats.errors} folders could not be compared — object fetch failed. Results are partial; counts cover what was read.`}
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
                  { value: "path", label: t`Sort: path` },
                  { value: "status", label: t`Sort: status` }
                ]}
                value={sort}
                onChange={(v) => setSort((v as SortMode) ?? "delta")}
                w={180}
              />
              {expanded.size > 0 && (
                <Button variant="subtle" size="xs" onClick={() => setExpanded(new Set())}>
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

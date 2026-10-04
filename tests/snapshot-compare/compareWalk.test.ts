import { describe, expect, it } from "vitest";
import type { DirEntry, DirManifest } from "../../src/core/types";
import { walkTrees, type WalkProgress } from "../../src/snapshot-compare/compareWalk";

function file(name: string, obj: string, size: number): DirEntry {
  return { name, type: "f", mode: "0644", mtime: "2026-01-01T00:00:00Z", obj, size };
}

function dirEntry(name: string, obj: string): DirEntry {
  return {
    name,
    type: "d",
    mode: "0700",
    mtime: "2026-01-01T00:00:00Z",
    obj,
    summ: { size: 0, files: 0, symlinks: 0, dirs: 0, maxTime: "", numFailed: 0 }
  };
}

function fileAt(name: string, obj: string, size: number, mtime: string): DirEntry {
  return { ...file(name, obj, size), mtime };
}

function dirAt(name: string, obj: string, mtime: string): DirEntry {
  return { ...dirEntry(name, obj), mtime };
}

function manifest(entries: DirEntry[]): DirManifest {
  return { steam: "", entries, summary: { size: 0, files: 0, symlinks: 0, dirs: 0, maxTime: "", numFailed: 0 } };
}

describe("walkTrees", () => {
  it("fetches only differing folders, never identical subtrees", async () => {
    const fetched: string[] = [];
    const fetcher = async (oid: string) => {
      fetched.push(oid);
      if (oid === "dChanged") return manifest([file("inner-new", "i2", 5)]);
      if (oid === "dOld") return manifest([]);
      if (oid === "dSame") return manifest([file("inner", "i1", 1)]);
      throw new Error(`unexpected fetch ${oid}`);
    };
    const rootA = manifest([dirEntry("same", "dSame"), dirEntry("changed", "dOld")]);
    const rootB = manifest([dirEntry("same", "dSame"), dirEntry("changed", "dChanged")]);

    const { roots, stats } = await walkTrees(rootA, rootB, fetcher);

    // dSame was never fetched on either side
    expect(fetched.filter((o) => o === "dSame")).toHaveLength(0);
    expect(fetched.sort()).toEqual(["dChanged", "dOld"]);
    expect(stats.skippedDirs).toBe(1);
    expect(stats.filesAdded).toBe(1);
    expect(stats.delta).toBe(5);
    expect(roots.find((n) => n.name === "changed")?.agg?.filesAdded).toBe(1);
  });

  it("marks failed folders as errors and keeps the rest of the walk", async () => {
    const fetcher = async (oid: string) => {
      if (oid === "dBad") throw new Error("fetch failed");
      if (oid === "dOkB") return manifest([file("fresh", "f1", 3)]);
      return manifest([]);
    };
    const rootA = manifest([dirEntry("bad", "dBad"), dirEntry("ok", "dOkA")]);
    const rootB = manifest([dirEntry("bad", "dBadB"), dirEntry("ok", "dOkB")]);

    const { roots, stats } = await walkTrees(rootA, rootB, fetcher);
    expect(stats.errors).toBe(1);
    expect(roots.find((n) => n.name === "bad")?.status).toBe("error");
    expect(roots.find((n) => n.name === "ok")?.fetched).toBe(true);
  });

  it("reports progress as folders are read", async () => {
    const events: WalkProgress[] = [];
    const fetcher = async () => manifest([]);
    const rootA = manifest([dirEntry("a", "a1"), dirEntry("b", "b1")]);
    const rootB = manifest([dirEntry("a", "a2"), dirEntry("b", "b2")]);

    await walkTrees(rootA, rootB, fetcher, { onProgress: (p) => events.push({ ...p }) });
    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1];
    expect(last.done).toBe(2);
    expect(last.pending).toBe(0);
    expect(last.errors).toBe(0);
  });

  it("rejects with AbortError when cancelled", async () => {
    const fetcher = async () => manifest([]);
    const rootA = manifest([dirEntry("a", "a1")]);
    const rootB = manifest([dirEntry("a", "a2")]);
    await expect(walkTrees(rootA, rootB, fetcher, { isCancelled: () => true })).rejects.toThrow("walk cancelled");
  });

  it("marks folders whose only difference is a timestamp as touched, not modified", async () => {
    const T1 = "2026-01-01T00:00:00Z";
    const T2 = "2026-01-02T00:00:00Z";
    const store: Record<string, DirManifest> = {
      kumaA: manifest([fileAt("db.sqlite", "same-content", 10, T1)]),
      kumaB: manifest([fileAt("db.sqlite", "same-content", 10, T2)]),
      botA: manifest([]),
      botB: manifest([]),
      adA: manifest([fileAt("conf.yaml", "c1", 4, T1)]),
      adB: manifest([fileAt("conf.yaml", "c2", 6, T2)])
    };
    const fetcher = async (oid: string) => store[oid];
    const rootA = manifest([
      dirAt("uptime-kuma", "kumaA", T1),
      dirAt("kurwa_bot", "botA", T1),
      dirAt("adguard", "adA", T1)
    ]);
    const rootB = manifest([
      dirAt("uptime-kuma", "kumaB", T2),
      dirAt("kurwa_bot", "botB", T2),
      dirAt("adguard", "adB", T2)
    ]);

    const { roots, stats } = await walkTrees(rootA, rootB, fetcher);

    expect(roots.map((n) => [n.name, n.status])).toEqual([
      ["adguard", "modified"],
      ["uptime-kuma", "touched"]
    ]);
    expect(stats.filesModified).toBe(1);
    expect(stats.filesTouched).toBe(1);
    expect(stats.delta).toBe(2);
  });

  it("separates the branch with a real change from the branch that was only touched, at any depth", async () => {
    const T1 = "2026-01-01T00:00:00Z";
    const T2 = "2026-01-02T00:00:00Z";
    const store: Record<string, DirManifest> = {
      topA: manifest([dirAt("quiet", "quietA", T1), dirAt("busy", "busyA", T1)]),
      topB: manifest([dirAt("quiet", "quietB", T2), dirAt("busy", "busyB", T2)]),
      quietA: manifest([dirAt("deep", "deepQA", T1)]),
      quietB: manifest([dirAt("deep", "deepQB", T2)]),
      deepQA: manifest([fileAt("wal", "w1", 3, T1)]),
      deepQB: manifest([fileAt("wal", "w1", 3, T2)]),
      busyA: manifest([dirAt("deep", "deepBA", T1)]),
      busyB: manifest([dirAt("deep", "deepBB", T2)]),
      deepBA: manifest([fileAt("data", "d1", 3, T1)]),
      deepBB: manifest([fileAt("data", "d2", 9, T2)])
    };
    const fetcher = async (oid: string) => store[oid];
    const rootA = manifest([dirAt("top", "topA", T1)]);
    const rootB = manifest([dirAt("top", "topB", T2)]);

    const { roots } = await walkTrees(rootA, rootB, fetcher);

    expect(roots).toHaveLength(1);
    const top = roots[0];
    expect(top.children?.map((n) => [n.name, n.status])).toEqual([
      ["busy", "modified"],
      ["quiet", "touched"]
    ]);
    expect(top.children?.[0].children?.[0].children?.map((n) => n.name)).toEqual(["data"]);
    expect(top.agg?.filesModified).toBe(1);
    expect(top.agg?.filesTouched).toBe(1);
  });

  it("keeps folders that could not be read visible next to pruned ones", async () => {
    const fetcher = async (oid: string) => {
      if (oid === "badB") throw new Error("fetch failed");
      return manifest([]);
    };
    const rootA = manifest([dirEntry("bad", "badA"), dirEntry("quiet", "quietA")]);
    const rootB = manifest([dirEntry("bad", "badB"), dirEntry("quiet", "quietB")]);

    const { roots, stats } = await walkTrees(rootA, rootB, fetcher);

    expect(roots.map((n) => n.name)).toEqual(["bad"]);
    expect(roots[0].status).toBe("error");
    expect(stats.errors).toBe(1);
  });

  it("gives every node a unique id so UI state cannot leak between paths", async () => {
    const store: Record<string, DirManifest> = {
      aA: manifest([fileAt("log", "l1", 1, "t")]),
      aB: manifest([fileAt("log", "l2", 2, "t")]),
      bA: manifest([fileAt("log", "m1", 1, "t")]),
      bB: manifest([fileAt("log", "m2", 2, "t")])
    };
    const fetcher = async (oid: string) => store[oid];
    const rootA = manifest([dirEntry("a", "aA"), dirEntry("b", "bA")]);
    const rootB = manifest([dirEntry("a", "aB"), dirEntry("b", "bB")]);

    const { roots } = await walkTrees(rootA, rootB, fetcher);

    const ids: string[] = [];
    const collect = (nodes: typeof roots) => {
      for (const n of nodes) {
        ids.push(n.id);
        if (n.children) collect(n.children);
      }
    };
    collect(roots);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});

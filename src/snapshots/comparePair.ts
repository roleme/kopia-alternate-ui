type ComparableSnapshot = {
  startTime: string;
  rootID: string;
};

export type ComparePair<T> = {
  older: T;
  newer: T;
};

export function pickComparePair<T extends ComparableSnapshot>(snapshots: T[]): ComparePair<T> | undefined {
  const byNewest = [...snapshots].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const [newer, ...older] = byNewest;
  if (newer === undefined || older.length === 0) return undefined;
  return { newer, older: older.find((s) => s.rootID !== newer.rootID) ?? older[0] };
}

export function compareSearch(
  source: { host: string; userName: string; path: string },
  pair: ComparePair<ComparableSnapshot>
) {
  return new URLSearchParams({
    host: source.host,
    userName: source.userName,
    path: source.path,
    a: pair.older.rootID,
    b: pair.newer.rootID
  }).toString();
}

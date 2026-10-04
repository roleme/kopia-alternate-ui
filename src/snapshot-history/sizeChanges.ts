type SizedSnapshot = {
  id: string;
  startTime: string;
  summary: { size: number };
};

export function sizeChangesById(snapshots: SizedSnapshot[]): Map<string, number | undefined> {
  const ordered = [...snapshots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const changes = new Map<string, number | undefined>();

  ordered.forEach((snapshot, index) => {
    const previous = ordered[index - 1];
    changes.set(snapshot.id, previous ? snapshot.summary.size - previous.summary.size : undefined);
  });

  return changes;
}

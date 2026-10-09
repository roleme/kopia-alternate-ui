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

type CountedSnapshot = {
  id: string;
  startTime: string;
  summary: { files: number; dirs: number };
};

export type CountChange = {
  files?: number;
  dirs?: number;
};

export function countChangesById(snapshots: CountedSnapshot[]): Map<string, CountChange> {
  const ordered = [...snapshots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const changes = new Map<string, CountChange>();

  ordered.forEach((snapshot, index) => {
    const previous = ordered[index - 1];
    changes.set(
      snapshot.id,
      previous
        ? {
            files: snapshot.summary.files - previous.summary.files,
            dirs: snapshot.summary.dirs - previous.summary.dirs
          }
        : {}
    );
  });

  return changes;
}

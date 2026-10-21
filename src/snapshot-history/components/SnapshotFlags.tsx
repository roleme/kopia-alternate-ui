import { t } from "@lingui/core/macro";
import type { Snapshot } from "../../core/types";
import classes from "./SnapshotFlags.module.css";

export function hasSnapshotFlags(snapshot: Snapshot) {
  return Boolean(snapshot.incomplete) || (snapshot.summary.numFailed ?? 0) > 0;
}

export function SnapshotFlags({ snapshot }: { snapshot: Snapshot }) {
  const failed = snapshot.summary.numFailed ?? 0;

  return (
    <>
      {snapshot.incomplete && (
        <span className={classes.flag} data-tone="incomplete" title={snapshot.incomplete}>
          <span className={classes.dot} />
          {t`Incomplete`}
        </span>
      )}
      {failed > 0 && (
        <span className={classes.flag} data-tone="failed">
          <span className={classes.dot} />
          {t`${failed} failed`}
        </span>
      )}
    </>
  );
}

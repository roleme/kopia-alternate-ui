import { Plural, Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import RelativeDate from "../../core/RelativeDate";
import type { SourceStatus } from "../../core/types";
import { formatByteProgress, getSourceStatusView } from "../sourceStatus";
import classes from "./SourceStatusLine.module.css";

type Props = {
  source: SourceStatus;
  bytesStringBase2: boolean;
};

type Tone = "neutral" | "error" | "late" | "running";

export default function SourceStatusLine({ source, bytesStringBase2 }: Props) {
  const view = getSourceStatusView(source);
  let tone: Tone = "neutral";
  let text: ReactNode;

  switch (view.kind) {
    case "running":
      tone = "running";
      text =
        view.percent === undefined || view.doneBytes === undefined || view.totalBytes === undefined ? (
          <Trans>Running</Trans>
        ) : (
          <>
            <Trans>Running</Trans> · {view.percent}% ·{" "}
            {formatByteProgress(view.doneBytes, view.totalBytes, bytesStringBase2)}
          </>
        );
      break;
    case "queued":
      text = <Trans>Queued</Trans>;
      break;
    case "paused":
      text = <Trans>Paused</Trans>;
      break;
    case "manual":
      text = <Trans>Manual</Trans>;
      break;
    case "errors":
      tone = "error";
      text = <Plural value={view.count} one="# error" other="# errors" />;
      break;
    case "overdue":
      tone = "late";
      text = (
        <Trans>
          Overdue - due <RelativeDate value={view.dueAt} />
        </Trans>
      );
      break;
    case "due":
      text = (
        <Trans>
          Due <RelativeDate value={view.dueAt} />
        </Trans>
      );
      break;
    case "scheduled":
      text = (
        <Trans>
          Next <RelativeDate value={view.at} />
        </Trans>
      );
      break;
    case "firstRun":
      text = (
        <Trans>
          First run <RelativeDate value={view.at} />
        </Trans>
      );
      break;
    default:
      return null;
  }

  return (
    <span className={classes.status} data-tone={tone}>
      <span className={classes.dot} />
      <span>{text}</span>
    </span>
  );
}

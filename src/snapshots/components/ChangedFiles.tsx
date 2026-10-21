import { plural, t } from "@lingui/core/macro";
import { useAppContext } from "../../core/context/AppContext";
import type { SourceStatus } from "../../core/types";
import { sourceChangedFiles } from "../sourceStatus";

type Props = {
  source: SourceStatus;
  className?: string;
};

export default function ChangedFiles({ source, className }: Props) {
  const { locale } = useAppContext();
  const counts = sourceChangedFiles(source);
  if (!counts) return null;

  const number = new Intl.NumberFormat(locale);
  const changed = number.format(counts.changed);
  const total = number.format(counts.total);
  const text =
    counts.changed === 0
      ? t`No files changed`
      : plural(counts.total, {
          one: `${changed} of ${total} file changed`,
          other: `${changed} of ${total} files changed`
        });

  return (
    <span
      className={className}
      style={{ whiteSpace: "nowrap" }}
      title={t`Files read again because they are new or modified. Unchanged files are skipped.`}
    >
      {text}
    </span>
  );
}

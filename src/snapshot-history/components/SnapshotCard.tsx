import { t } from "@lingui/core/macro";
import { Badge, Button, Checkbox, Text, UnstyledButton } from "@mantine/core";
import { IconArrowsDiff, IconFile, IconFileText, IconFolder, IconPin } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAppContext } from "../../core/context/AppContext";
import FormattedDate from "../../core/FormattedDate";
import { OneLine } from "../../core/OneLine";
import type { Snapshot } from "../../core/types";
import signedSizeDisplayName from "../../utils/formatSignedSize";
import sizeDisplayName from "../../utils/formatSize";
import RetentionBadge from "./RetentionBadge";
import classes from "./SnapshotCard.module.css";

export const SNAPSHOT_DATE_FORMAT = "ll, LT";

type Props = {
  snapshot: Snapshot;
  sourcePath: string;
  bytesStringBase2: boolean;
  sizeChange?: number;
  fileChange?: number;
  dirChange?: number;
  canCompare: boolean;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  onCompare: () => void;
  onDescribe: () => void;
  onPin: () => void;
  onEditPin: (pin: string) => void;
};

function Delta({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <Text span fz="xs" fw={800} c={value > 0 ? "green.6" : "red.6"}>
      {value > 0 ? "+" : "−"}
      {Math.abs(value).toLocaleString()}
    </Text>
  );
}

export function SnapshotCard({
  snapshot,
  sourcePath,
  bytesStringBase2,
  sizeChange,
  fileChange,
  dirChange,
  canCompare,
  selecting,
  selected,
  onToggle,
  onCompare,
  onDescribe,
  onPin,
  onEditPin
}: Props) {
  const { locale } = useAppContext();
  const number = new Intl.NumberFormat(locale);
  const { summary } = snapshot;
  const failed = summary.numFailed ?? 0;

  const body: ReactNode = (
    <>
      {selecting && <Checkbox className={classes.checkbox} checked={selected} readOnly tabIndex={-1} aria-hidden />}
      <div className={classes.top}>
        <Text span fz="sm" className={classes.date}>
          <FormattedDate value={snapshot.startTime} format={SNAPSHOT_DATE_FORMAT} />
        </Text>
        <Text span fz="md" className={classes.size}>
          {sizeDisplayName(summary.size, bytesStringBase2)}
        </Text>
        <div className={classes.counts}>
          <span className={classes.count}>
            <IconFile size={15} color="var(--mantine-color-blue-6)" aria-label={t`Files`} />
            {number.format(summary.files)}
            <Delta value={fileChange} />
          </span>
          <span className={classes.count}>
            <IconFolder size={15} color="var(--mantine-color-yellow-6)" aria-label={t`Folders`} />
            {number.format(summary.dirs)}
            <Delta value={dirChange} />
          </span>
        </div>
        <div className={classes.change}>
          {sizeChange !== undefined && (
            <Text span fz="xs" fw={700} c={sizeChange > 0 ? "green.6" : sizeChange < 0 ? "red.6" : "dimmed"}>
              {signedSizeDisplayName(sizeChange, bytesStringBase2)}
            </Text>
          )}
        </div>
      </div>
      {snapshot.description && (
        <Text fz="xs" c="dimmed" truncate mt={3}>
          {snapshot.description}
        </Text>
      )}
      <div className={classes.labels}>
        <OneLine
          items={snapshot.retention.map((r) => ({ key: r, node: <RetentionBadge retention={r} /> }))}
          keep={
            <>
              {snapshot.pins.map((p) => (
                <Badge
                  key={p}
                  className={classes.pin}
                  variant="outline"
                  color="grape"
                  tt="none"
                  radius={5}
                  leftSection={<IconPin size={12} />}
                >
                  {p}
                </Badge>
              ))}
              {failed > 0 && (
                <Text span fz="xs" fw={800} c="red.6" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span className={classes.dot} />
                  {t`${failed} failed`}
                </Text>
              )}
            </>
          }
        />
      </div>
    </>
  );

  return (
    <li className={classes.root}>
      {selecting ? (
        <UnstyledButton
          className={`${classes.link} ${classes.selecting}`}
          role="checkbox"
          aria-checked={selected}
          onClick={onToggle}
        >
          {body}
        </UnstyledButton>
      ) : (
        <>
          <Link className={classes.link} to={`/snapshots/dir/${snapshot.rootID}`} state={{ label: sourcePath }}>
            {body}
          </Link>
          <div className={classes.actions}>
            {canCompare && (
              <Button
                variant="light"
                size="sm"
                classNames={{ root: classes.action, section: classes.actionSection }}
                leftSection={<IconArrowsDiff size={16} />}
                aria-label={t`Compare with previous snapshot`}
                onClick={onCompare}
              >
                <span className={classes.actionLabel}>{t`Compare`}</span>
              </Button>
            )}
            <Button
              variant="light"
              size="sm"
              leftSection={<IconFileText size={16} />}
              aria-label={t`Update description`}
              onClick={onDescribe}
            >
              <span className={classes.actionLabel}>{t`Describe`}</span>
            </Button>
            {snapshot.pins.length === 0 ? (
              <Button
                variant="light"
                size="sm"
                classNames={{ root: classes.action, section: classes.actionSection }}
                color="grape"
                leftSection={<IconPin size={16} />}
                aria-label={t`Add pin to prevent snapshot deletion`}
                onClick={onPin}
              >
                <span className={classes.actionLabel}>{t`Pin`}</span>
              </Button>
            ) : (
              snapshot.pins.map((p) => (
                <Button
                  key={p}
                  variant="light"
                  size="sm"
                  classNames={{ root: classes.action, section: classes.actionSection }}
                  color="grape"
                  leftSection={<IconPin size={16} />}
                  aria-label={t`Edit pin ${p}`}
                  onClick={() => onEditPin(p)}
                >
                  <span className={classes.actionLabel}>{snapshot.pins.length === 1 ? t`Edit pin` : p}</span>
                </Button>
              ))
            )}
          </div>
        </>
      )}
    </li>
  );
}

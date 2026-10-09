import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Badge, Progress, Text } from "@mantine/core";
import { IconFileCertificate, IconFolderOpen, IconPackageExport } from "@tabler/icons-react";
import { Fragment } from "react";
import { Link } from "react-router";
import { CardActions, CardButton } from "../../core/CardActions";
import RelativeDate from "../../core/RelativeDate";
import type { SourceInfo, SourceStatus } from "../../core/types";
import sizeDisplayName from "../../utils/formatSize";
import { sourceHistoryLink, sourcePolicyLink } from "../sourceLinks";
import { getSourceStatusView } from "../sourceStatus";
import classes from "./SourceCard.module.css";
import SourceStatusLine from "./SourceStatusLine";

type Props = {
  source: SourceStatus;
  bytesStringBase2: boolean;
  snapshotNowLoading: boolean;
  onSnapshotNow: (source: SourceInfo) => void;
};

export function SourceCard({ source, bytesStringBase2, snapshotNowLoading, onSnapshotNow }: Props) {
  const info = source.source;
  const size = source.lastSnapshot?.rootEntry?.summ?.size;
  const view = getSourceStatusView(source);
  const canAct = source.status === "IDLE" || source.status === "PAUSED" || source.status === "REMOTE";

  return (
    <li className={classes.root}>
      <Link className={classes.link} to={sourceHistoryLink(info)}>
        <div className={classes.top}>
          <IconFolderOpen size={20} color="var(--mantine-color-yellow-6)" />
          <span className={classes.path}>
            {info.path.split("/").map((segment, index, all) => (
              <Fragment key={all.slice(0, index + 1).join("/")}>
                {segment}
                {index < all.length - 1 && (
                  <>
                    /<wbr />
                  </>
                )}
              </Fragment>
            ))}
          </span>
          <span className={classes.size}>
            {size === undefined ? (
              <Text span c="dimmed">
                –
              </Text>
            ) : (
              sizeDisplayName(size, bytesStringBase2)
            )}
          </span>
        </div>
        <div className={classes.statusRow}>
          <SourceStatusLine source={source} bytesStringBase2={bytesStringBase2} />
          {source.lastSnapshot && (
            <span className={classes.when}>
              <RelativeDate value={source.lastSnapshot.startTime} />
            </span>
          )}
        </div>
        {view.kind === "running" && view.percent !== undefined && (
          <Progress className={classes.progress} value={view.percent} size={5} animated />
        )}
        <div className={classes.owner}>
          <span>{`${info.userName}@${info.host}`}</span>
          {source.status === "REMOTE" && (
            <Badge size="sm" radius={5} tt="none" variant="light" color="grape">
              <Trans>Remote</Trans>
            </Badge>
          )}
        </div>
      </Link>
      {canAct && (
        <CardActions>
          {source.status !== "REMOTE" && (
            <CardButton
              icon={IconPackageExport}
              label={t`Snapshot now`}
              color="green"
              loading={snapshotNowLoading}
              onClick={() => onSnapshotNow(info)}
            />
          )}
          <CardButton
            icon={IconFileCertificate}
            label={t`Policy`}
            ariaLabel={t`View Policy`}
            color="grape"
            to={sourcePolicyLink(info)}
          />
        </CardActions>
      )}
    </li>
  );
}

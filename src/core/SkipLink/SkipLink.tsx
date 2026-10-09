import { Trans } from "@lingui/react/macro";
import classes from "./SkipLink.module.css";

export const MAIN_CONTENT_ID = "main-content";

export function SkipLink() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={classes.link}>
      <Trans>Skip to main content</Trans>
    </a>
  );
}

import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { refreshButtonProps } from "./commonButtons";

type Props = {
  onClick: () => void;
  loading?: boolean;
};

export function RefreshButton({ onClick, loading }: Props) {
  return (
    <Button loading={loading} onClick={onClick} {...refreshButtonProps}>
      <Trans>Refresh</Trans>
    </Button>
  );
}

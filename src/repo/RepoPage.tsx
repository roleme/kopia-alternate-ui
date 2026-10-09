import { Trans } from "@lingui/react/macro";
import { Container, Stack } from "@mantine/core";
import { useAppContext } from "../core/context/AppContext";
import { ErrorAlert } from "../core/ErrorAlert/ErrorAlert";
import { PageHeader } from "../core/PageHeader/PageHeader";
import ConfigureRepoSection from "./ConfigureRepoSection";
import ConnectedRepoSection from "./ConnectedRepoSection/ConnectedRepoSection";

function RepoPage() {
  const { repoStatus, statusError, reloadStatus } = useAppContext();
  if (statusError) {
    return (
      <Container>
        <Stack>
          <PageHeader title={<Trans>Repository</Trans>} onRefresh={reloadStatus} />
          <ErrorAlert error={statusError} />
        </Stack>
      </Container>
    );
  }
  if (repoStatus.connected) {
    return <ConnectedRepoSection />;
  }
  return <ConfigureRepoSection />;
}

export default RepoPage;

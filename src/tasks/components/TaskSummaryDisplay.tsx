import { t } from "@lingui/core/macro";
import { Alert, Loader } from "@mantine/core";
import { IconBan, IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";
import type { Task } from "../../core/types";

type Props = {
  task: Task;
};

export default function TaskSummaryDisplay({ task }: Props) {
  switch (task.status) {
    case "RUNNING":
      return <Alert title={t`Task in progress`} icon={<Loader type="dots" size="xs" />} />;
    case "SUCCESS":
      return <Alert color="green" title={t`Task succeeded`} icon={<IconCircleCheckFilled size={20} />} />;
    case "FAILED":
      return (
        <Alert color="red" title={t`Task failed`} icon={<IconCircleXFilled size={20} />}>
          {task.errorMessage}
        </Alert>
      );
    case "CANCELED":
      return <Alert color="yellow" title={t`Task canceled`} icon={<IconBan size={20} />} />;
    case "CANCELING":
      return <Alert color="yellow" title={t`Canceling task`} icon={<IconBan size={20} />} />;
  }
}

import dayjs from "dayjs";
import formatDuration from "../utils/formatDuration";

type Props = {
  from: string;
  to: string;
};

export default function TimeDuration({ from, to }: Props) {
  return formatDuration(dayjs(to).diff(dayjs(from)));
}

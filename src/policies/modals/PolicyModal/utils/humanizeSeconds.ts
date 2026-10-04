import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";

dayjs.extend(durationPlugin);

export function humanizeSeconds(seconds: number, locale: string) {
  return dayjs.duration(seconds, "seconds").locale(locale).humanize();
}

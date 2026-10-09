import { useAppContext } from "./context/AppContext";
import formatLocalDate from "./dates/formatLocalDate";

type Props = {
  value: string;
  format?: string;
};

export default function FormattedDate({ value, format = "L LTS" }: Props) {
  const { locale } = useAppContext();
  return formatLocalDate(value, locale, format);
}

import enLocale from "dayjs/locale/en";
import enGbLocale from "dayjs/locale/en-gb";
import nbLocale from "dayjs/locale/nb";
import nnLocale from "dayjs/locale/nn";

const englishWithFormats: ILocale = {
  ...enLocale,
  formats: {
    LTS: "h:mm:ss A",
    LT: "h:mm A",
    L: "MM/DD/YYYY",
    LL: "MMMM D, YYYY",
    LLL: "MMMM D, YYYY h:mm A",
    LLLL: "dddd, MMMM D, YYYY h:mm A"
  }
};

const formats: Record<string, ILocale> = {
  en: englishWithFormats,
  "en-GB": enGbLocale,
  nb: nbLocale,
  nn: nnLocale
};

export default formats;

import { type FlagComponent, GB, NO, US } from "country-flag-icons/react/3x2";

const supportedLocales: Record<string, { name: string; cc: string; flag: FlagComponent }> = {
  en: {
    name: "English",
    cc: "US",
    flag: US
  },
  "en-GB": {
    name: "English (UK)",
    cc: "GB",
    flag: GB
  },
  nb: {
    name: "Norsk - Bokmål",
    cc: "NO",
    flag: NO
  }
};

export default supportedLocales;

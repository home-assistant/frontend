import memoizeOne from "memoize-one";
import { FrontendLocaleData, TimeFormat } from "../../data/translation";

export const useAmPm = memoizeOne((locale: FrontendLocaleData): boolean => {
  if (
    locale.time_format === TimeFormat.language ||
    locale.time_format === TimeFormat.system
  ) {
    const testLanguage =
      locale.time_format === TimeFormat.language ? locale.language : undefined;
    const test = new Date().toLocaleString(testLanguage);
    return test.includes("AM") || test.includes("PM");
  }

  return locale.time_format === TimeFormat.am_pm;
});

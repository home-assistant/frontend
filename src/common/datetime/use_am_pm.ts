import memoizeOne from "memoize-one";
import { FrontendLocaleData, TimeFormat } from "../../data/translation";

export const useAmPm = memoizeOne((locale: FrontendLocaleData): boolean => {
  if (
    locale.time_format === TimeFormat.language ||
    locale.time_format === TimeFormat.system
  ) {
    const testLanguage =
      locale.time_format === TimeFormat.language ? locale.language : undefined;
    const test = new Date("January 1, 2023 22:00:00").toLocaleString(
      testLanguage
    );
    return test.includes("10");
  }

  return locale.time_format === TimeFormat.am_pm;
});

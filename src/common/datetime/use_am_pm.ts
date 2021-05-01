import { FrontendLocaleData, TimeFormat } from "../../data/translation";

export const useAmPm = (locale: FrontendLocaleData): boolean => {
  if (locale.time_format === TimeFormat.language) {
    const test = new Date().toLocaleString(locale.language);
    return test.includes("AM") || test.includes("PM");
  }

  if (locale.time_format === TimeFormat.system) {
    const test = new Date().toLocaleString();
    return test.includes("AM") || test.includes("PM");
  }

  return locale.time_format === TimeFormat.am_pm;
};

import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import { formatDateVeryShort } from "../../common/datetime/format_date";
import { formatTime } from "../../common/datetime/format_time";

export function getLabelFormatter(
  locale: FrontendLocaleData,
  config: HassConfig
) {
  return (value: number | Date) => {
    const date = new Date(value);
    // show only date for the beginning of the day
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0
    ) {
      return `{day|${formatDateVeryShort(date, locale, config)}}`;
    }
    return formatTime(date, locale, config);
  };
}

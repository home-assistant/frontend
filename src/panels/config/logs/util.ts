import type { HassConfig } from "home-assistant-js-websocket";
import { mdiAlert, mdiAlertCircle, mdiAlertOctagon } from "@mdi/js";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";
import { formatTimeWithSeconds } from "../../../common/datetime/format_time";
import type { SystemLogLevel } from "../../../data/system_log";
import type { FrontendLocaleData } from "../../../data/translation";

// Core's system log only keeps warnings and above
export const LOG_LEVELS = [
  { level: "critical", path: mdiAlertOctagon, color: "var(--error-color)" },
  { level: "error", path: mdiAlertCircle, color: "var(--error-color)" },
  { level: "warning", path: mdiAlert, color: "var(--warning-color)" },
] as const satisfies readonly {
  level: SystemLogLevel;
  path: string;
  color: string;
}[];

export const formatSystemLogTime = (
  date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const dateTime = new Date(date * 1000);
  const dateTimeDay = new Date(date * 1000).setHours(0, 0, 0, 0);

  return dateTimeDay < today
    ? formatDateTimeWithSeconds(dateTime, locale, config)
    : formatTimeWithSeconds(dateTime, locale, config);
};

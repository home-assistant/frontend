import type { HassConfig } from "home-assistant-js-websocket";
import { mdiAlert, mdiAlertCircle, mdiAlertOctagon } from "@mdi/js";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";
import { formatTimeWithSeconds } from "../../../common/datetime/format_time";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { domainToName } from "../../../data/integration";
import {
  getLoggedErrorIntegration,
  SYSTEM_LOG_LEVELS,
  type LoggedError,
  type SystemLogLevel,
} from "../../../data/system_log";
import type { FrontendLocaleData } from "../../../data/translation";

const LEVEL_ICONS = {
  critical: { path: mdiAlertOctagon, color: "var(--error-color)" },
  error: { path: mdiAlertCircle, color: "var(--error-color)" },
  warning: { path: mdiAlert, color: "var(--warning-color)" },
} as const satisfies Record<
  (typeof SYSTEM_LOG_LEVELS)[number],
  { path: string; color: string }
>;

export const LOG_LEVELS = SYSTEM_LOG_LEVELS.map((level) => ({
  level,
  ...LEVEL_ICONS[level],
}));

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

export const formatSystemLogMultipleMessages = (
  item: LoggedError,
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig
) =>
  localize("ui.panel.config.logs.multiple_messages", {
    time: formatSystemLogTime(item.first_occurred, locale, config),
    counter: item.count,
  });

export interface SystemLogFilters {
  search: string;
  // Logger names of the picked integrations, undefined when none are picked
  loggers?: string[];
  levels?: SystemLogLevel[];
}

// The entries the errors list shows. The filter pane counts each filter from
// the entries the other filters leave.
export const filterSystemLogItems = (
  items: LoggedError[],
  { search, loggers, levels }: SystemLogFilters,
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig
): LoggedError[] => {
  const term = search.toLowerCase();

  return items.filter((item) => {
    if (levels?.length && !levels.includes(item.level)) {
      return false;
    }
    if (
      loggers &&
      !loggers.some(
        (logger) => item.name === logger || item.name.startsWith(`${logger}.`)
      )
    ) {
      return false;
    }
    if (!term) {
      return true;
    }
    const integration = getLoggedErrorIntegration(item);
    return (
      item.message.some((message) => message.toLowerCase().includes(term)) ||
      item.source[0].toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      (!!integration &&
        domainToName(localize, integration).toLowerCase().includes(term)) ||
      formatSystemLogTime(item.timestamp, locale, config)
        .toLowerCase()
        .includes(term) ||
      formatSystemLogMultipleMessages(item, localize, locale, config)
        .toLowerCase()
        .includes(term)
    );
  });
};

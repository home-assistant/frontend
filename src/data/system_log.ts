import { HomeAssistant } from "../types";

export type SystemLogLevel =
  | "critical"
  | "error"
  | "warning"
  | "info"
  | "debug";

export interface LoggedError {
  name: string;
  message: [string];
  level: SystemLogLevel;
  source: [string, number];
  exception: string;
  count: number;
  // unix timestamps in seconds
  timestamp: number;
  first_occurred: number;
}

export const fetchSystemLog = async (hass: HomeAssistant) => {
  const log = await hass.callWS<LoggedError[]>({ type: "system_log/list" });
  for (const error of log) {
    error.level = error.level.toLowerCase() as LoggedError["level"];
  }
  return log;
};

export const getLoggedErrorIntegration = (item: LoggedError) => {
  // Try to derive from logger name
  if (item.name.startsWith("homeassistant.components.")) {
    return item.name.split(".")[2];
  }
  if (item.name.startsWith("custom_components.")) {
    return item.name.split(".")[1];
  }

  // Try to derive from logged location
  if (item.source[0].startsWith("custom_components/")) {
    return item.source[0].split("/")[1];
  }

  if (item.source[0].startsWith("homeassistant/components/")) {
    return item.source[0].split("/")[2];
  }

  return undefined;
};

export const isCustomIntegrationError = (item: LoggedError) =>
  item.name.startsWith("custom_components.") ||
  item.source[0].startsWith("custom_components/");

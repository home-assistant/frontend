import type { HomeAssistantApi } from "../../types";
import { LogSeverity } from "../integration";

export interface SupervisorLogEntry {
  time: string;
  level: keyof typeof LogSeverity;
  message: string;
}

export interface SupervisorLogFilter {
  // Only entries logged in the last `duration` milliseconds
  duration?: number;
  // Only entries at this level or above
  minLevel?: LogSeverity;
}

// "%(asctime)s.%(msecs)03d %(levelname)s (%(threadName)s) [%(name)s] %(message)s"
const LOG_LINE =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\.(\d{3}) ([A-Z]+) \(.*?\) \[.*?\] (.*)$/;

const isLogSeverity = (level: string): level is keyof typeof LogSeverity =>
  level in LogSeverity;

const parseLogLine = (line: string) => {
  const match = LOG_LINE.exec(line);

  if (!match) {
    return undefined;
  }

  const [, date, time, milliseconds, level, message] = match;

  if (!isLogSeverity(level)) {
    return undefined;
  }

  return {
    timestamp: Date.parse(`${date}T${time}.${milliseconds}Z`),
    entry: { time, level, message },
  };
};

// The timestamps are in the Supervisor's own time zone, so the duration is
// measured back from the newest entry instead of the browser's clock.
export const parseSupervisorLogs = (
  log: string,
  {
    duration = Infinity,
    minLevel = LogSeverity.NOTSET,
  }: SupervisorLogFilter = {}
): SupervisorLogEntry[] => {
  const lines = log
    .split("\n")
    .map(parseLogLine)
    .filter((line) => line !== undefined);

  if (!lines.length) {
    return [];
  }

  const since = lines[lines.length - 1].timestamp - duration;

  return lines
    .filter(
      ({ timestamp, entry }) =>
        timestamp >= since && LogSeverity[entry.level] >= minLevel
    )
    .map(({ entry }) => entry);
};

// The Supervisor sends its newest 100 log entries by default
export const fetchSupervisorLogs = async (
  api: HomeAssistantApi,
  filter?: SupervisorLogFilter
): Promise<SupervisorLogEntry[]> => {
  const response = await api.callApiRaw(
    "GET",
    "hassio/supervisor/logs?no_colors"
  );

  if (!response.ok) {
    throw new Error(`Response error: ${response.status}`);
  }

  const log = await response.text();

  return parseSupervisorLogs(log, filter);
};

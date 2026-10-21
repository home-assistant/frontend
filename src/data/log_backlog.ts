// eslint-disable-next-line no-control-regex
export const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

// A record starts with its timestamp; the lines after it without one, like a
// traceback, belong to it.
const LOG_RECORD_START = /^\d{4}-\d{2}-\d{2} \S+ /;

// Merges the backlogs of several raw log subscriptions in time order, keeping
// the lines of each record together.
export const mergeLogBacklogs = (backlogs: string[][]): string[] =>
  backlogs
    .flatMap((lines) => {
      const records: { time: string; lines: string[] }[] = [];
      for (const line of lines) {
        const start = LOG_RECORD_START.exec(line.replace(ANSI_ESCAPE, ""));
        if (start || !records.length) {
          records.push({ time: start?.[0] ?? "", lines: [line] });
        } else {
          records[records.length - 1].lines.push(line);
        }
      }
      return records;
    })
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
    .flatMap((record) => record.lines);

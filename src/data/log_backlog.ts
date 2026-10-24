// eslint-disable-next-line no-control-regex
export const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

// A record starts with its timestamp; the lines after it without one, like a
// traceback, belong to it.
const LOG_RECORD_START = /^\d{4}-\d{2}-\d{2} \S+ /;

interface LogRecord {
  time: string;
  lines: string[];
}

const toRecords = (lines: string[]): LogRecord[] => {
  const records: LogRecord[] = [];
  for (const line of lines) {
    const start = LOG_RECORD_START.exec(line.replace(ANSI_ESCAPE, ""));
    if (start || !records.length) {
      records.push({ time: start?.[0] ?? "", lines: [line] });
    } else {
      records[records.length - 1].lines.push(line);
    }
  }
  return records;
};

const byTime = (a: LogRecord, b: LogRecord) =>
  a.time < b.time ? -1 : a.time > b.time ? 1 : 0;

// Merges the lines of several raw log subscriptions in time order, keeping the
// lines of each record together. Integrations can share a logger, then every
// subscription gets its records, so a record is kept as often as a single
// subscription sent it.
export class LogStreamMerger {
  private _seen = new Map<string, number[]>();

  constructor(
    private readonly _streams: number,
    private readonly _limit: number
  ) {}

  public merge(batches: string[][]): string[] {
    return batches
      .flatMap((lines, stream) =>
        toRecords(lines).filter((record) => this._isNew(stream, record))
      )
      .sort(byTime)
      .flatMap((record) => record.lines);
  }

  private _isNew(stream: number, record: LogRecord): boolean {
    if (this._streams === 1) {
      return true;
    }
    const key = record.lines.join("\n").replace(ANSI_ESCAPE, "");
    const counts =
      this._seen.get(key) ?? new Array<number>(this._streams).fill(0);
    counts[stream]++;
    // Keep the most recent records, as the copies arrive close together
    this._seen.delete(key);
    this._seen.set(key, counts);
    if (this._seen.size > this._limit) {
      this._seen.delete(this._seen.keys().next().value!);
    }
    return counts.every(
      (count, other) => other === stream || count < counts[stream]
    );
  }
}

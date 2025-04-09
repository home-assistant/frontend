import type { LogbookEntry } from "../../../../src/data/logbook";
import type { AutomationTraceExtended } from "../../../../src/data/trace";

export interface DemoTrace {
  trace: AutomationTraceExtended;
  logbookEntries: LogbookEntry[];
}

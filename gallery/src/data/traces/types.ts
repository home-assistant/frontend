import type { AutomationTraceExtended } from "../../../../src/data/trace";
import type { LogbookEntry } from "../../../../src/data/logbook";

export interface DemoTrace {
  trace: AutomationTraceExtended;
  logbookEntries: LogbookEntry[];
}

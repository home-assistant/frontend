import { AutomationTraceExtended } from "../../../../src/data/trace";
import { LogbookEntry } from "../../../../src/data/logbook";

export interface DemoTrace {
  trace: AutomationTraceExtended;
  logbookEntries: LogbookEntry[];
}

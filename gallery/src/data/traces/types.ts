import { AutomationTraceExtended } from "../../../../src/data/automation_debug";
import { LogbookEntry } from "../../../../src/data/logbook";

export interface DemoTrace {
  trace: AutomationTraceExtended;
  logbookEntries: LogbookEntry[];
}

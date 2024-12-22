import { LogbookEntry } from "../../../../src/data/logbook";
import { AutomationTraceExtended } from "../../../../src/data/trace";
import { DemoTrace } from "./types";

export const mockDemoTrace = (
  tracePartial: Partial<AutomationTraceExtended>,
  logbookEntries?: LogbookEntry[]
): DemoTrace => ({
  trace: {
    last_step: "",
    run_id: "0",
    state: "stopped",
    timestamp: {
      start: "2021-03-25T04:36:51.223693+00:00",
      finish: "2021-03-25T04:36:51.266132+00:00",
    },
    trigger: "mocked trigger",
    domain: "automation",
    item_id: "1615419646544",
    trace: {
      "trigger/0": [
        {
          path: "trigger/0",
          changed_variables: {
            trigger: {
              description: "mocked trigger",
            },
          },
          timestamp: "2021-03-25T04:36:51.223693+00:00",
        },
      ],
    },
    config: {
      trigger: [],
      action: [],
    },
    context: {
      id: "abcd",
    },
    script_execution: "finished",
    ...tracePartial,
  },
  logbookEntries: logbookEntries || [],
});

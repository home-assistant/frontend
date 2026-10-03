import type { DemoTrace } from "./types";

export const notTriggeredTrace: DemoTrace = {
  trace: {
    last_step: "trigger/0",
    run_id: "788767ce152d3d4475134bf1107986d4",
    state: "stopped",
    script_execution: "not_triggered",
    not_triggered: true,
    timestamp: {
      start: "2021-03-25T04:36:51.223337+00:00",
      finish: "2021-03-25T04:36:51.223341+00:00",
    },
    // Not-triggered traces have no trigger description.
    trigger: null,
    domain: "automation",
    item_id: "1781703842452",
    trace: {
      "trigger/0": [
        {
          path: "trigger/0",
          timestamp: "2021-03-25T04:36:51.223340+00:00",
          changed_variables: {
            trigger: {
              id: "0",
              idx: "0",
              alias: null,
              platform: "light.turned_on",
            },
          },
          result: {
            reason: "new_state_not_a_match",
            data: {
              entity_id: "light.bed_light",
              to_state: "off",
            },
          },
        },
      ],
    },
    config: {
      id: "1781703842452",
      alias: "Light Turned On Notification",
      description: "Send a notification when a specific light is turned on.",
      triggers: [
        {
          trigger: "light.turned_on",
          target: {
            floor_id: "test",
          },
          options: {
            for: "00:00:00",
            behavior: "each",
          },
        },
      ],
      conditions: [],
      actions: [
        {
          action: "notify.notify",
          data: {
            message: "A light was turned on.",
          },
        },
      ],
      mode: "single",
    },
    context: {
      id: "01KVAX7CG7XBDYGJYAGA4XJHGX",
      parent_id: "01KVAX7CG631JRX4H3JS5JJ11Q",
      user_id: null,
    },
  },
  logbookEntries: [],
};

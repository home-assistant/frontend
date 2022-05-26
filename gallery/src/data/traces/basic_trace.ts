import { DemoTrace } from "./types";

export const basicTrace: DemoTrace = {
  trace: {
    last_step: "action/2",
    run_id: "0",
    state: "stopped",
    timestamp: {
      start: "2021-03-25T04:36:51.223693+00:00",
      finish: "2021-03-25T04:36:51.266132+00:00",
    },
    trigger: "state of input_boolean.toggle_1",
    domain: "automation",
    item_id: "1615419646544",
    trace: {
      "trigger/0": [
        {
          path: "trigger/0",
          timestamp: "2021-03-25T04:36:51.223693+00:00",
        },
      ],
      "condition/0": [
        {
          path: "condition/0",
          timestamp: "2021-03-25T04:36:51.228243+00:00",
          changed_variables: {
            trigger: {
              platform: "state",
              entity_id: "input_boolean.toggle_1",
              from_state: {
                entity_id: "input_boolean.toggle_1",
                state: "on",
                attributes: {
                  editable: true,
                  friendly_name: "Toggle 1",
                },
                last_changed: "2021-03-24T19:03:59.141440+00:00",
                last_updated: "2021-03-24T19:03:59.141440+00:00",
                context: {
                  id: "5d0918eb379214d07554bdab6a08bcff",
                  parent_id: null,
                  user_id: null,
                },
              },
              to_state: {
                entity_id: "input_boolean.toggle_1",
                state: "off",
                attributes: {
                  editable: true,
                  friendly_name: "Toggle 1",
                },
                last_changed: "2021-03-25T04:36:51.220696+00:00",
                last_updated: "2021-03-25T04:36:51.220696+00:00",
                context: {
                  id: "664d6d261450a9ecea6738e97269a149",
                  parent_id: null,
                  user_id: "d1b4e89da01445fa8bc98e39fac477ca",
                },
              },
              for: null,
              attribute: null,
              description: "state of input_boolean.toggle_1",
            },
          },
          result: {
            result: true,
          },
        },
      ],
      "action/0": [
        {
          path: "action/0",
          timestamp: "2021-03-25T04:36:51.243018+00:00",
          changed_variables: {
            trigger: {
              platform: "state",
              entity_id: "input_boolean.toggle_1",
              from_state: {
                entity_id: "input_boolean.toggle_1",
                state: "on",
                attributes: {
                  editable: true,
                  friendly_name: "Toggle 1",
                },
                last_changed: "2021-03-24T19:03:59.141440+00:00",
                last_updated: "2021-03-24T19:03:59.141440+00:00",
                context: {
                  id: "5d0918eb379214d07554bdab6a08bcff",
                  parent_id: null,
                  user_id: null,
                },
              },
              to_state: {
                entity_id: "input_boolean.toggle_1",
                state: "off",
                attributes: {
                  editable: true,
                  friendly_name: "Toggle 1",
                },
                last_changed: "2021-03-25T04:36:51.220696+00:00",
                last_updated: "2021-03-25T04:36:51.220696+00:00",
                context: {
                  id: "664d6d261450a9ecea6738e97269a149",
                  parent_id: null,
                  user_id: "d1b4e89da01445fa8bc98e39fac477ca",
                },
              },
              for: null,
              attribute: null,
              description: "state of input_boolean.toggle_1",
            },
            context: {
              id: "6cfcae368e7b3686fad6c59e83ae76c9",
              parent_id: "664d6d261450a9ecea6738e97269a149",
              user_id: null,
            },
          },
          result: {
            params: {
              domain: "input_boolean",
              service: "toggle",
              data: {},
              target: {
                entity_id: ["input_boolean.toggle_4"],
              },
            },
            running_script: false,
            limit: 10,
          },
        },
      ],
      "action/1": [
        {
          path: "action/1",
          timestamp: "2021-03-25T04:36:51.252406+00:00",
          result: {
            choice: 0,
          },
        },
      ],
      "action/1/choose/0": [
        {
          path: "action/1/choose/0",
          timestamp: "2021-03-25T04:36:51.254569+00:00",
          result: {
            result: true,
          },
        },
      ],
      "action/1/choose/0/conditions/0": [
        {
          path: "action/1/choose/0/conditions/0",
          timestamp: "2021-03-25T04:36:51.254697+00:00",
          result: {
            result: true,
          },
        },
      ],
      "action/1/choose/0/sequence/0": [
        {
          path: "action/1/choose/0/sequence/0",
          timestamp: "2021-03-25T04:36:51.257360+00:00",
          result: {
            params: {
              domain: "input_boolean",
              service: "toggle",
              data: {},
              target: {
                entity_id: ["input_boolean.toggle_2"],
              },
            },
            running_script: false,
            limit: 10,
          },
        },
      ],
      "action/1/choose/0/sequence/1": [
        {
          path: "action/1/choose/0/sequence/1",
          timestamp: "2021-03-25T04:36:51.260658+00:00",
          result: {
            params: {
              domain: "input_boolean",
              service: "toggle",
              data: {},
              target: {
                entity_id: ["input_boolean.toggle_3"],
              },
            },
            running_script: false,
            limit: 10,
          },
        },
      ],
      "action/2": [
        {
          path: "action/2",
          timestamp: "2021-03-25T04:36:51.264159+00:00",
          result: {
            params: {
              domain: "input_boolean",
              service: "toggle",
              data: {},
              target: {
                entity_id: ["input_boolean.toggle_4"],
              },
            },
            running_script: false,
            limit: 10,
          },
        },
      ],
    },

    config: {
      id: "1615419646544",
      alias: "Ensure Party mode",
      description: "",
      trigger: [
        {
          platform: "state",
          entity_id: "input_boolean.toggle_1",
        },
      ],
      condition: [
        {
          condition: "template",
          alias: "Test if Paulus is home",
          value_template: "{{ true }}",
        },
      ],
      action: [
        {
          service: "input_boolean.toggle",
          target: {
            entity_id: "input_boolean.toggle_4",
          },
        },
        {
          choose: [
            {
              alias: "If toggle 3 is on",
              conditions: [
                {
                  condition: "template",
                  value_template:
                    "{{ is_state('input_boolean.toggle_3', 'on') }}",
                },
              ],
              sequence: [
                {
                  service: "input_boolean.toggle",
                  alias: "Toggle 2 while 3 is on",
                  target: {
                    entity_id: "input_boolean.toggle_2",
                  },
                },
                {
                  service: "input_boolean.toggle",
                  alias: "Toggle 3",
                  target: {
                    entity_id: "input_boolean.toggle_3",
                  },
                },
              ],
            },
          ],
          default: [
            {
              service: "input_boolean.toggle",
              alias: "Toggle 2",
              target: {
                entity_id: "input_boolean.toggle_2",
              },
            },
          ],
        },
        {
          service: "input_boolean.toggle",
          target: {
            entity_id: "input_boolean.toggle_4",
          },
        },
      ],
      mode: "single",
    },
    context: {
      id: "6cfcae368e7b3686fad6c59e83ae76c9",
      parent_id: "664d6d261450a9ecea6738e97269a149",
      user_id: null,
    },
    script_execution: "finished",
  },
  logbookEntries: [
    {
      name: "Ensure Party mode",
      message: "has been triggered by state of input_boolean.toggle_1",
      source: "state of input_boolean.toggle_1",
      entity_id: "automation.toggle_toggles",
      context_id: "6cfcae368e7b3686fad6c59e83ae76c9",
      when: 1616647011.240832,
      domain: "automation",
    },
    {
      when: 1616647011.249828,
      name: "Toggle 4",
      state: "on",
      entity_id: "input_boolean.toggle_4",
      context_entity_id: "automation.toggle_toggles",
      context_entity_id_name: "Ensure Party mode",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Ensure Party mode",
    },
    {
      when: 1616647011.258947,
      name: "Toggle 2",
      state: "on",
      entity_id: "input_boolean.toggle_2",
      context_entity_id: "automation.toggle_toggles",
      context_entity_id_name: "Ensure Party mode",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Ensure Party mode",
    },
    {
      when: 1616647011.261806,
      name: "Toggle 3",
      state: "off",
      entity_id: "input_boolean.toggle_3",
      context_entity_id: "automation.toggle_toggles",
      context_entity_id_name: "Ensure Party mode",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Ensure Party mode",
    },
    {
      when: 1616647011.265246,
      name: "Toggle 4",
      state: "off",
      entity_id: "input_boolean.toggle_4",
      context_entity_id: "automation.toggle_toggles",
      context_entity_id_name: "Ensure Party mode",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Ensure Party mode",
    },
  ],
};

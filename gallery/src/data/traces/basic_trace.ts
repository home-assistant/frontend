import { DemoTrace } from "./types";

export const basicTrace: DemoTrace = {
  trace: {
    last_action: "action/0/choose/0/sequence/0",
    last_condition: "condition/0",
    run_id: "0",
    state: "stopped",
    timestamp: {
      start: "2021-03-22T19:17:09.519178+00:00",
      finish: "2021-03-22T19:17:09.556129+00:00",
    },
    trigger: "state of input_boolean.toggle_1",
    domain: "automation",
    item_id: "1615419646544",
    action_trace: {
      "action/0": [
        {
          path: "action/0",
          timestamp: "2021-03-22T19:17:09.526794+00:00",
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
                last_changed: "2021-03-22T19:11:24.418709+00:00",
                last_updated: "2021-03-22T19:11:24.418709+00:00",
                context: {
                  id: "55daa6c47a7613b0800fe0ec81090a84",
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
                last_changed: "2021-03-22T19:17:09.516874+00:00",
                last_updated: "2021-03-22T19:17:09.516874+00:00",
                context: {
                  id: "116d7a6562d594b114f7efe728619a3f",
                  parent_id: null,
                  user_id: "d1b4e89da01445fa8bc98e39fac477ca",
                },
              },
              for: null,
              attribute: null,
              description: "state of input_boolean.toggle_1",
            },
            context: {
              id: "54a7371cff31be0f4010c9fde2317322",
              parent_id: "116d7a6562d594b114f7efe728619a3f",
              user_id: null,
            },
          },
          result: {
            choice: 0,
          },
        },
      ],
      "action/0/choose/0": [
        {
          path: "action/0/choose/0",
          timestamp: "2021-03-22T19:17:09.530176+00:00",
          result: {
            result: true,
          },
        },
      ],
      "action/0/choose/0/conditions/0": [
        {
          path: "action/0/choose/0/conditions/0",
          timestamp: "2021-03-22T19:17:09.539155+00:00",
          result: {
            result: true,
          },
        },
      ],
      "action/0/choose/0/sequence/0": [
        {
          path: "action/0/choose/0/sequence/0",
          timestamp: "2021-03-22T19:17:09.542769+00:00",
          result: {
            params: {
              domain: "input_boolean",
              service: "toggle",
              service_data: {},
              target: {
                entity_id: ["input_boolean.toggle_2"],
              },
            },
            running_script: false,
            limit: 10,
          },
        },
      ],
    },
    condition_trace: {
      "condition/0": [
        {
          path: "condition/0",
          timestamp: "2021-03-22T19:17:09.520267+00:00",
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
                last_changed: "2021-03-22T19:11:24.418709+00:00",
                last_updated: "2021-03-22T19:11:24.418709+00:00",
                context: {
                  id: "55daa6c47a7613b0800fe0ec81090a84",
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
                last_changed: "2021-03-22T19:17:09.516874+00:00",
                last_updated: "2021-03-22T19:17:09.516874+00:00",
                context: {
                  id: "116d7a6562d594b114f7efe728619a3f",
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
          choose: [
            {
              alias: "If toggle 3 is on",
              conditions: "{{ is_state('input_boolean.toggle_3', 'on') }}",
              sequence: [
                {
                  service: "input_boolean.toggle",
                  alias: "Toggle 2 while 3 is on",
                  target: {
                    entity_id: "input_boolean.toggle_2",
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
      ],
      mode: "single",
    },
    context: {
      id: "54a7371cff31be0f4010c9fde2317322",
      parent_id: "116d7a6562d594b114f7efe728619a3f",
      user_id: null,
    },
    variables: {
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
          last_changed: "2021-03-22T19:11:24.418709+00:00",
          last_updated: "2021-03-22T19:11:24.418709+00:00",
          context: {
            id: "55daa6c47a7613b0800fe0ec81090a84",
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
          last_changed: "2021-03-22T19:17:09.516874+00:00",
          last_updated: "2021-03-22T19:17:09.516874+00:00",
          context: {
            id: "116d7a6562d594b114f7efe728619a3f",
            parent_id: null,
            user_id: "d1b4e89da01445fa8bc98e39fac477ca",
          },
        },
        for: null,
        attribute: null,
        description: "state of input_boolean.toggle_1",
      },
    },
  },
  logbookEntries: [
    {
      name: "Ensure Party mode",
      message: "has been triggered by state of input_boolean.toggle_1",
      source: "state of input_boolean.toggle_1",
      entity_id: "automation.toggle_toggles",
      context_id: "54a7371cff31be0f4010c9fde2317322",
      when: "2021-03-22T19:17:09.523041+00:00",
      domain: "automation",
    },
    {
      when: "2021-03-22T19:17:09.549346+00:00",
      name: "Toggle 2",
      state: "on",
      entity_id: "input_boolean.toggle_2",
      context_entity_id: "automation.toggle_toggles",
      context_entity_id_name: "Ensure Party mode",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Ensure Party mode",
    },
  ],
};

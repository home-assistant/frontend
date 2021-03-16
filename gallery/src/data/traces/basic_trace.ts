import { DemoTrace } from "./types";

export const basicTrace: DemoTrace = {
  trace: {
    last_action: "action/0",
    last_condition: "condition/0",
    run_id: "0",
    state: "stopped",
    timestamp: {
      start: "2021-03-12T21:38:48.050464+00:00",
      finish: "2021-03-12T21:38:48.068458+00:00",
    },
    trigger: "state of input_boolean.toggle_1",
    unique_id: "1615419646544",
    action_trace: {
      "action/0": [
        {
          path: "action/0",
          timestamp: "2021-03-12T21:38:48.054395+00:00",
          changed_variables: {
            trigger: {
              platform: "state",
              entity_id: "input_boolean.toggle_1",
              from_state: {
                entity_id: "input_boolean.toggle_1",
                state: "on",
                attributes: { editable: true, friendly_name: "Toggle 1" },
                last_changed: "2021-03-12T21:38:03.262985+00:00",
                last_updated: "2021-03-12T21:38:03.262985+00:00",
                context: {
                  id: "4ad34793b237d7cb5e541e8a331e7bf9",
                  parent_id: null,
                  user_id: null,
                },
              },
              to_state: {
                entity_id: "input_boolean.toggle_1",
                state: "off",
                attributes: { editable: true, friendly_name: "Toggle 1" },
                last_changed: "2021-03-12T21:38:48.049816+00:00",
                last_updated: "2021-03-12T21:38:48.049816+00:00",
                context: {
                  id: "2d83ca81663c85df51fae2a1f940d0e7",
                  parent_id: null,
                  user_id: "d1b4e89da01445fa8bc98e39fac477ca",
                },
              },
              for: null,
              attribute: null,
              description: "state of input_boolean.toggle_1",
            },
            context: {
              id: "febeaa3d50152bae8017d783ed3c0751",
              parent_id: "2d83ca81663c85df51fae2a1f940d0e7",
              user_id: null,
            },
          },
        },
      ],
    },
    condition_trace: {
      "condition/0": [
        {
          path: "condition/0",
          timestamp: "2021-03-12T21:38:48.050783+00:00",
          changed_variables: {
            trigger: {
              platform: "state",
              entity_id: "input_boolean.toggle_1",
              from_state: {
                entity_id: "input_boolean.toggle_1",
                state: "on",
                attributes: { editable: true, friendly_name: "Toggle 1" },
                last_changed: "2021-03-12T21:38:03.262985+00:00",
                last_updated: "2021-03-12T21:38:03.262985+00:00",
                context: {
                  id: "4ad34793b237d7cb5e541e8a331e7bf9",
                  parent_id: null,
                  user_id: null,
                },
              },
              to_state: {
                entity_id: "input_boolean.toggle_1",
                state: "off",
                attributes: { editable: true, friendly_name: "Toggle 1" },
                last_changed: "2021-03-12T21:38:48.049816+00:00",
                last_updated: "2021-03-12T21:38:48.049816+00:00",
                context: {
                  id: "2d83ca81663c85df51fae2a1f940d0e7",
                  parent_id: null,
                  user_id: "d1b4e89da01445fa8bc98e39fac477ca",
                },
              },
              for: null,
              attribute: null,
              description: "state of input_boolean.toggle_1",
            },
          },
          result: { result: true },
        },
      ],
    },
    config: {
      id: "1615419646544",
      alias: "Basic Trace Example",
      description: "",
      trigger: [{ platform: "state", entity_id: "input_boolean.toggle_1" }],
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
          alias: "Enable party mode",
          target: { entity_id: "input_boolean.toggle_2" },
        },
      ],
      mode: "single",
    },
    context: {
      id: "febeaa3d50152bae8017d783ed3c0751",
      parent_id: "2d83ca81663c85df51fae2a1f940d0e7",
      user_id: null,
    },
    variables: {
      trigger: {
        platform: "state",
        entity_id: "input_boolean.toggle_1",
        from_state: {
          entity_id: "input_boolean.toggle_1",
          state: "on",
          attributes: { editable: true, friendly_name: "Toggle 1" },
          last_changed: "2021-03-12T21:38:03.262985+00:00",
          last_updated: "2021-03-12T21:38:03.262985+00:00",
          context: {
            id: "4ad34793b237d7cb5e541e8a331e7bf9",
            parent_id: null,
            user_id: null,
          },
        },
        to_state: {
          entity_id: "input_boolean.toggle_1",
          state: "off",
          attributes: { editable: true, friendly_name: "Toggle 1" },
          last_changed: "2021-03-12T21:38:48.049816+00:00",
          last_updated: "2021-03-12T21:38:48.049816+00:00",
          context: {
            id: "2d83ca81663c85df51fae2a1f940d0e7",
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
      when: "2021-03-12T21:38:48.051460+00:00",
      domain: "automation",
    },
    {
      when: "2021-03-12T21:38:48.064184+00:00",
      name: "Toggle 2",
      state: "off",
      entity_id: "input_boolean.toggle_2",
      context_entity_id: "automation.toggle_toggles",
      context_entity_id_name: "Ensure Party mode",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Ensure Party mode",
    },
  ],
};

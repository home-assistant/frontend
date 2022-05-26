import { DemoTrace } from "./types";

export const motionLightTrace: DemoTrace = {
  trace: {
    last_step: "action/3",
    run_id: "1",
    state: "stopped",
    timestamp: {
      start: "2021-03-14T06:07:01.768006+00:00",
      finish: "2021-03-14T06:07:53.287525+00:00",
    },
    trigger: "state of binary_sensor.pauluss_macbook_pro_camera_in_use",
    domain: "automation",
    item_id: "1614732497392",
    trace: {
      "trigger/0": [
        {
          path: "trigger/0",
          timestamp: "2021-03-25T04:36:51.223693+00:00",
        },
      ],
      "action/0": [
        {
          path: "action/0",
          timestamp: "2021-03-14T06:07:01.771038+00:00",
          changed_variables: {
            trigger: {
              platform: "state",
              entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
              from_state: {
                entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
                state: "off",
                attributes: {
                  friendly_name: "Paulus’s MacBook Pro Camera In Use",
                  icon: "mdi:camera-off",
                },
                last_changed: "2021-03-14T06:06:29.235325+00:00",
                last_updated: "2021-03-14T06:06:29.235325+00:00",
                context: {
                  id: "ad4864c5ce957c38a07b50378eeb245d",
                  parent_id: null,
                  user_id: null,
                },
              },
              to_state: {
                entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
                state: "on",
                attributes: {
                  friendly_name: "Paulus’s MacBook Pro Camera In Use",
                  icon: "mdi:camera",
                },
                last_changed: "2021-03-14T06:07:01.762009+00:00",
                last_updated: "2021-03-14T06:07:01.762009+00:00",
                context: {
                  id: "e22ddfd5f11dc4aad9a52fc10dab613b",
                  parent_id: null,
                  user_id: null,
                },
              },
              for: null,
              attribute: null,
              description:
                "state of binary_sensor.pauluss_macbook_pro_camera_in_use",
            },
            context: {
              id: "43b6ee9293a551c5cc14e8eb60af54ba",
              parent_id: "e22ddfd5f11dc4aad9a52fc10dab613b",
              user_id: null,
            },
          },
        },
      ],
      "action/1": [
        { path: "action/1", timestamp: "2021-03-14T06:07:01.875316+00:00" },
      ],
      "action/2": [
        {
          path: "action/2",
          timestamp: "2021-03-14T06:07:53.195013+00:00",
          changed_variables: {
            wait: {
              remaining: null,
              trigger: {
                platform: "state",
                entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
                from_state: {
                  entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
                  state: "on",
                  attributes: {
                    friendly_name: "Paulus’s MacBook Pro Camera In Use",
                    icon: "mdi:camera",
                  },
                  last_changed: "2021-03-14T06:07:01.762009+00:00",
                  last_updated: "2021-03-14T06:07:01.762009+00:00",
                  context: {
                    id: "e22ddfd5f11dc4aad9a52fc10dab613b",
                    parent_id: null,
                    user_id: null,
                  },
                },
                to_state: {
                  entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
                  state: "off",
                  attributes: {
                    friendly_name: "Paulus’s MacBook Pro Camera In Use",
                    icon: "mdi:camera-off",
                  },
                  last_changed: "2021-03-14T06:07:53.186755+00:00",
                  last_updated: "2021-03-14T06:07:53.186755+00:00",
                  context: {
                    id: "b2308cc91d509ea8e0c623331ab178d6",
                    parent_id: null,
                    user_id: null,
                  },
                },
                for: null,
                attribute: null,
                description:
                  "state of binary_sensor.pauluss_macbook_pro_camera_in_use",
              },
            },
          },
        },
      ],
      "action/3": [
        {
          path: "action/3",
          timestamp: "2021-03-14T06:07:53.196014+00:00",
        },
      ],
    },
    config: {
      mode: "restart",
      max_exceeded: "silent",
      trigger: [
        {
          platform: "state",
          entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
          from: "off",
          to: "on",
        },
      ],
      action: [
        {
          service: "light.turn_on",
          target: {
            entity_id: "light.elgato_key_light_air",
          },
        },
        {
          wait_for_trigger: [
            {
              platform: "state",
              entity_id: "binary_sensor.pauluss_macbook_pro_camera_in_use",
              from: "on",
              to: "off",
            },
          ],
        },
        {
          delay: 0,
        },
        {
          service: "light.turn_off",
          target: {
            entity_id: "light.elgato_key_light_air",
          },
        },
      ],
      id: "1614732497392",
      alias: "Auto Elgato",
      description: "",
    },
    context: {
      id: "43b6ee9293a551c5cc14e8eb60af54ba",
      parent_id: "e22ddfd5f11dc4aad9a52fc10dab613b",
      user_id: null,
    },
    script_execution: "finished",
  },
  logbookEntries: [
    {
      name: "Auto Elgato",
      message:
        "has been triggered by state of binary_sensor.pauluss_macbook_pro_camera_in_use",
      source: "state of binary_sensor.pauluss_macbook_pro_camera_in_use",
      entity_id: "automation.auto_elgato",
      when: 1615702021.768492,
      domain: "automation",
    },
    {
      when: 1615702021.872187,
      name: "Elgato Key Light Air",
      state: "on",
      entity_id: "light.elgato_key_light_air",
      context_entity_id: "automation.auto_elgato",
      context_entity_id_name: "Auto Elgato",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Auto Elgato",
    },
    {
      when: 1615702073.284505,
      name: "Elgato Key Light Air",
      state: "off",
      entity_id: "light.elgato_key_light_air",
      context_entity_id: "automation.auto_elgato",
      context_entity_id_name: "Auto Elgato",
      context_event_type: "automation_triggered",
      context_domain: "automation",
      context_name: "Auto Elgato",
    },
  ],
};

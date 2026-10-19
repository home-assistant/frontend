import type { DemoAutomation } from "../types";

export const demoAutomationsSections: DemoAutomation[] = [
  {
    lastTriggered: 60 * 9,
    state: "off",
    icon: "mdi:auto-mode",
    config: {
      id: "1700669321947",
      alias: "Home Assistant Auto-update",
      description:
        "Installs Home Assistant updates at night, so nobody is bothered by the restart.",
      triggers: [{ trigger: "time", at: "03:00:00" }],
      conditions: [
        {
          condition: "update.is_available",
          target: { entity_id: "update.home_assistant_core_update" },
          options: { for: "00:00:00" },
        },
      ],
      actions: [
        {
          action: "update.install",
          target: { entity_id: "update.home_assistant_core_update" },
          data: { backup: true },
        },
      ],
      mode: "queued",
    },
  },
  {
    lastTriggered: 25,
    config: {
      id: "1700669322001",
      alias: "Kitchen lights on motion",
      description:
        "Turns on the kitchen lights when motion is detected and turns them off again once the kitchen has been empty for 2 minutes.",
      triggers: [
        {
          trigger: "motion.detected",
          target: { entity_id: "binary_sensor.kitchen_motion" },
          options: { for: "00:00:00" },
        },
      ],
      conditions: [],
      actions: [
        {
          action: "light.turn_on",
          target: {
            entity_id: ["light.kitchen_spotlights", "light.worktop_spotlights"],
          },
          data: { brightness_pct: 80 },
        },
        {
          wait_for_trigger: [
            {
              trigger: "motion.cleared",
              target: { entity_id: "binary_sensor.kitchen_motion" },
              options: { for: "00:02:00" },
            },
          ],
        },
        {
          action: "light.turn_off",
          target: {
            entity_id: ["light.kitchen_spotlights", "light.worktop_spotlights"],
          },
        },
      ],
      mode: "restart",
    },
  },
  {
    lastTriggered: 60 * 3,
    config: {
      id: "1700669322002",
      alias: "Outdoor light from sunset to sunrise",
      description:
        "Uses trigger IDs to handle both sunset and sunrise in one automation.",
      triggers: [
        {
          trigger: "sun.sunset",
          id: "sunset",
          options: {
            offset: { days: 0, hours: 0, minutes: 15, seconds: 0 },
            offset_type: "before",
          },
        },
        {
          trigger: "sun.sunrise",
          id: "sunrise",
          options: {
            offset: { days: 0, hours: 0, minutes: 0, seconds: 0 },
            offset_type: "before",
          },
        },
      ],
      conditions: [],
      actions: [
        {
          choose: [
            {
              conditions: [{ condition: "trigger", id: "sunset" }],
              sequence: [
                {
                  action: "light.turn_on",
                  target: { entity_id: "light.outdoor_light" },
                },
              ],
            },
            {
              conditions: [{ condition: "trigger", id: "sunrise" }],
              sequence: [
                {
                  action: "light.turn_off",
                  target: { entity_id: "light.outdoor_light" },
                },
              ],
            },
          ],
        },
      ],
      mode: "single",
    },
  },
  {
    lastTriggered: 60 * 14,
    config: {
      id: "1700669322003",
      alias: "Flood light on motion when dark",
      description:
        "Turns on the flood light for 5 minutes when someone walks by in the dark.",
      triggers: [
        {
          trigger: "motion.detected",
          target: { entity_id: "binary_sensor.outdoor_motion_sensor_motion" },
          options: { for: "00:00:00" },
        },
      ],
      conditions: [
        {
          condition: "illuminance.is_value",
          target: { entity_id: "sensor.outdoor_motion_sensor_illuminance" },
          options: {
            threshold: {
              type: "below",
              value: { number: 50, unit_of_measurement: "lx" },
            },
            for: "00:00:00",
          },
        },
      ],
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.flood_light" },
        },
        { delay: { hours: 0, minutes: 5, seconds: 0, milliseconds: 0 } },
        {
          action: "light.turn_off",
          target: { entity_id: "light.flood_light" },
        },
      ],
      mode: "restart",
    },
  },
  {
    lastTriggered: 60 * 26,
    config: {
      id: "1700669322004",
      alias: "Close the shutters when it gets hot",
      description:
        "Keeps the living room cool by closing the shutters on hot, sunny days.",
      triggers: [
        {
          trigger: "temperature.crossed_threshold",
          target: { entity_id: "sensor.outdoor_temperature" },
          options: {
            threshold: {
              type: "above",
              value: { number: 25, unit_of_measurement: "°C" },
            },
            for: "00:10:00",
          },
        },
      ],
      conditions: [{ condition: "sun.is_up" }],
      actions: [
        {
          action: "cover.close_cover",
          target: {
            entity_id: [
              "cover.living_room_garden_shutter",
              "cover.living_room_graveyard_shutter",
              "cover.living_room_left_shutter",
              "cover.living_room_right_shutter",
            ],
          },
        },
      ],
      mode: "single",
    },
  },
  {
    lastTriggered: 60 * 50,
    config: {
      id: "1700669322005",
      alias: "Fridge door left open",
      description:
        "Sends a reminder when the fridge door has been open for 2 minutes.",
      triggers: [
        {
          trigger: "door.opened",
          target: { entity_id: "binary_sensor.fridge_door" },
          options: { for: "00:02:00" },
        },
      ],
      conditions: [],
      actions: [
        {
          action: "notify.notify",
          data: {
            title: "Fridge door",
            message: "The fridge door has been open for 2 minutes.",
          },
        },
      ],
      mode: "single",
    },
  },
  {
    lastTriggered: 90,
    config: {
      id: "1700669322006",
      alias: "Meeting mode",
      description:
        "Pauses the music in the study and turns on the lights when a meeting starts.",
      triggers: [
        {
          trigger: "switch.turned_on",
          target: { entity_id: "switch.in_meeting" },
          options: { for: "00:00:00" },
        },
      ],
      conditions: [],
      actions: [
        {
          action: "media_player.media_pause",
          target: { entity_id: "media_player.study_nest_hub" },
        },
        {
          action: "light.turn_on",
          target: { entity_id: "light.study_spotlights" },
          data: { brightness_pct: 100, color_temp_kelvin: 4000 },
        },
      ],
      mode: "single",
    },
  },
  {
    lastTriggered: 60 * 20,
    config: {
      id: "1700669322009",
      alias: "Lights up when the music pauses",
      description:
        "Turns on the living room spotlights when the music is paused in the evening.",
      triggers: [
        {
          trigger: "media_player.paused_playing",
          target: { entity_id: "media_player.living_room_nest_mini" },
          options: { for: "00:00:00" },
        },
      ],
      conditions: [{ condition: "sun.is_set" }],
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.living_room_spotlights" },
          data: { brightness_pct: 40 },
        },
      ],
      mode: "single",
    },
  },
  {
    lastTriggered: 60 * 7,
    config: {
      id: "1700669322007",
      alias: "Lower heating when the car leaves",
      triggers: [
        {
          trigger: "zone.left",
          target: { entity_id: "device_tracker.car" },
          options: { zone: "zone.home", for: "00:00:00" },
        },
      ],
      conditions: [
        {
          condition: "time",
          weekday: ["mon", "tue", "wed", "thu", "fri"],
        },
      ],
      actions: [
        {
          action: "climate.set_temperature",
          target: {
            entity_id: ["climate.ground_floor", "climate.first_floor"],
          },
          data: { temperature: 17 },
        },
      ],
      mode: "single",
    },
  },
  {
    lastTriggered: 60 * 11,
    config: {
      id: "1700669322008",
      alias: "Good night",
      description:
        "Turns off all lights and closes the shutters at 23:00 on weeknights.",
      triggers: [
        {
          trigger: "time",
          at: "23:00:00",
          weekday: ["sun", "mon", "tue", "wed", "thu"],
        },
      ],
      conditions: [],
      actions: [
        {
          action: "light.turn_off",
          target: {
            entity_id: [
              "light.floor_lamp",
              "light.living_room_spotlights",
              "light.bar_lamp",
              "light.kitchen_spotlights",
              "light.worktop_spotlights",
              "light.study_spotlights",
            ],
          },
        },
        {
          action: "cover.close_cover",
          target: {
            entity_id: [
              "cover.living_room_garden_shutter",
              "cover.living_room_graveyard_shutter",
              "cover.living_room_left_shutter",
              "cover.living_room_right_shutter",
              "cover.kitchen_shutter",
              "cover.study_shutter",
            ],
          },
        },
      ],
      mode: "single",
    },
  },
];

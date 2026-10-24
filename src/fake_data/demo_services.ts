// This file is auto-generated from Home Assistant Core. Do not edit by hand.
// Regenerate with `script/gen_demo_core_data`.
import type { HassServices } from "home-assistant-js-websocket";

// Core sends more than the HassServices type covers, like sections and list
// examples.
export const demoServices = {
  alarm_control_panel: {
    alarm_disarm: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: { entity: { domain: "alarm_control_panel" } },
    },
    alarm_arm_custom_bypass: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: {
        entity: { domain: "alarm_control_panel", supported_features: [16] },
      },
    },
    alarm_arm_home: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: {
        entity: { domain: "alarm_control_panel", supported_features: [1] },
      },
    },
    alarm_arm_away: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: {
        entity: { domain: "alarm_control_panel", supported_features: [2] },
      },
    },
    alarm_arm_night: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: {
        entity: { domain: "alarm_control_panel", supported_features: [4] },
      },
    },
    alarm_arm_vacation: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: {
        entity: { domain: "alarm_control_panel", supported_features: [32] },
      },
    },
    alarm_trigger: {
      fields: { code: { example: "1234", selector: { text: null } } },
      target: {
        entity: { domain: "alarm_control_panel", supported_features: [8] },
      },
    },
  },
  automation: {
    turn_on: { fields: {}, target: { entity: { domain: "automation" } } },
    turn_off: {
      fields: { stop_actions: { default: true, selector: { boolean: null } } },
      target: { entity: { domain: "automation" } },
    },
    toggle: { fields: {}, target: { entity: { domain: "automation" } } },
    trigger: {
      fields: {
        skip_condition: { default: true, selector: { boolean: null } },
      },
      target: { entity: { domain: "automation" } },
    },
    reload: { fields: {} },
  },
  button: { press: { fields: {}, target: { entity: { domain: "button" } } } },
  calendar: {
    create_event: {
      fields: {
        summary: {
          required: true,
          example: "Department Party",
          selector: { text: null },
        },
        description: {
          example: "Meeting to provide technical review for 'Phoenix' design.",
          selector: { text: null },
        },
        start_date_time: {
          example: "2022-03-22 20:00:00",
          selector: { datetime: null },
        },
        end_date_time: {
          example: "2022-03-22 22:00:00",
          selector: { datetime: null },
        },
        start_date: { example: "2022-03-22", selector: { date: null } },
        end_date: { example: "2022-03-23", selector: { date: null } },
        in: { example: '{"days": 2} or {"weeks": 2}' },
        location: {
          example: "Conference Room - F123, Bldg. 002",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "calendar", supported_features: [1] } },
    },
    get_events: {
      fields: {
        start_date_time: {
          example: "2022-03-22 20:00:00",
          selector: { datetime: null },
        },
        end_date_time: {
          example: "2022-03-22 22:00:00",
          selector: { datetime: null },
        },
        duration: { selector: { duration: null } },
      },
      target: { entity: { domain: "calendar" } },
      response: { optional: false },
    },
  },
  camera: {
    turn_off: { fields: {}, target: { entity: { domain: "camera" } } },
    turn_on: { fields: {}, target: { entity: { domain: "camera" } } },
    enable_motion_detection: {
      fields: {},
      target: { entity: { domain: "camera" } },
    },
    disable_motion_detection: {
      fields: {},
      target: { entity: { domain: "camera" } },
    },
    snapshot: {
      fields: {
        filename: {
          required: true,
          example: "/tmp/snapshot_{{ entity_id.name }}.jpg",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "camera" } },
    },
    play_stream: {
      fields: {
        media_player: {
          required: true,
          selector: { entity: { domain: "media_player" } },
        },
        format: { default: "hls", selector: { select: { options: ["hls"] } } },
      },
      target: { entity: { domain: "camera" } },
    },
    record: {
      fields: {
        filename: {
          required: true,
          example: "/tmp/snapshot_{{ entity_id.name }}.mp4",
          selector: { text: null },
        },
        duration: {
          default: 30,
          selector: {
            number: { min: 1, max: 3600, unit_of_measurement: "seconds" },
          },
        },
        lookback: {
          default: 0,
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
      },
      target: { entity: { domain: "camera" } },
    },
  },
  climate: {
    set_preset_mode: {
      fields: {
        preset_mode: {
          required: true,
          example: "away",
          selector: { state: { attribute: "preset_mode" } },
        },
      },
      target: { entity: { domain: "climate", supported_features: [16] } },
    },
    set_temperature: {
      fields: {
        temperature: {
          filter: { supported_features: [1] },
          selector: { number: { min: 0, max: 250, step: 0.1, mode: "box" } },
        },
        temperature_range: {
          fields: {
            target_temp_high: {
              filter: { supported_features: [2] },
              selector: {
                number: { min: 0, max: 250, step: 0.1, mode: "box" },
              },
            },
            target_temp_low: {
              filter: { supported_features: [2] },
              selector: {
                number: { min: 0, max: 250, step: 0.1, mode: "box" },
              },
            },
          },
        },
        hvac_mode: {
          selector: { state: { hide_states: ["unavailable", "unknown"] } },
        },
      },
      target: { entity: { domain: "climate", supported_features: [1, 2] } },
    },
    set_humidity: {
      fields: {
        humidity: {
          required: true,
          selector: { number: { min: 30, max: 99, unit_of_measurement: "%" } },
        },
      },
      target: { entity: { domain: "climate", supported_features: [4] } },
    },
    set_fan_mode: {
      fields: {
        fan_mode: {
          required: true,
          example: "low",
          selector: { state: { attribute: "fan_mode" } },
        },
      },
      target: { entity: { domain: "climate", supported_features: [8] } },
    },
    set_hvac_mode: {
      fields: {
        hvac_mode: {
          selector: { state: { hide_states: ["unavailable", "unknown"] } },
        },
      },
      target: { entity: { domain: "climate" } },
    },
    set_swing_mode: {
      fields: {
        swing_mode: {
          required: true,
          example: "on",
          selector: { state: { attribute: "swing_mode" } },
        },
      },
      target: { entity: { domain: "climate", supported_features: [32] } },
    },
    set_swing_horizontal_mode: {
      fields: {
        swing_horizontal_mode: {
          required: true,
          example: "on",
          selector: { state: { attribute: "swing_horizontal_mode" } },
        },
      },
      target: { entity: { domain: "climate", supported_features: [512] } },
    },
    turn_on: {
      fields: {},
      target: { entity: { domain: "climate", supported_features: [256] } },
    },
    turn_off: {
      fields: {},
      target: { entity: { domain: "climate", supported_features: [128] } },
    },
    toggle: {
      fields: {},
      target: { entity: { domain: "climate", supported_features: [128, 256] } },
    },
  },
  conversation: {
    process: {
      fields: {
        text: {
          example: "Turn all lights on",
          required: true,
          selector: { text: null },
        },
        language: { example: "NL", selector: { text: null } },
        agent_id: {
          example: "homeassistant",
          selector: { conversation_agent: null },
        },
        conversation_id: {
          example: "my_conversation_1",
          selector: { text: null },
        },
      },
      response: { optional: true },
    },
    reload: {
      fields: {
        language: { example: "NL", selector: { text: null } },
        agent_id: {
          example: "homeassistant",
          selector: { conversation_agent: null },
        },
      },
    },
  },
  counter: {
    decrement: { fields: {}, target: { entity: { domain: "counter" } } },
    increment: { fields: {}, target: { entity: { domain: "counter" } } },
    reset: { fields: {}, target: { entity: { domain: "counter" } } },
    set_value: {
      fields: {
        value: {
          required: true,
          selector: {
            number: {
              min: -9223372036854776000,
              max: 9223372036854776000,
              mode: "box",
            },
          },
        },
      },
      target: { entity: { domain: "counter" } },
    },
  },
  cover: {
    open_cover: {
      fields: {
        speed: {
          example: "fast",
          filter: { supported_features: [256] },
          selector: { state: { attribute: "speed" } },
        },
      },
      target: { entity: { domain: "cover", supported_features: [1] } },
    },
    close_cover: {
      fields: {
        speed: {
          example: "fast",
          filter: { supported_features: [256] },
          selector: { state: { attribute: "speed" } },
        },
      },
      target: { entity: { domain: "cover", supported_features: [2] } },
    },
    toggle: {
      fields: {},
      target: { entity: { domain: "cover", supported_features: [3] } },
    },
    set_cover_position: {
      fields: {
        position: {
          required: true,
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
        speed: {
          filter: { supported_features: [256] },
          example: "fast",
          selector: { state: { attribute: "speed" } },
        },
      },
      target: { entity: { domain: "cover", supported_features: [4] } },
    },
    stop_cover: {
      fields: {},
      target: { entity: { domain: "cover", supported_features: [8] } },
    },
    open_cover_tilt: {
      fields: {},
      target: { entity: { domain: "cover", supported_features: [16] } },
    },
    close_cover_tilt: {
      fields: {},
      target: { entity: { domain: "cover", supported_features: [32] } },
    },
    toggle_cover_tilt: {
      fields: {},
      target: { entity: { domain: "cover", supported_features: [48] } },
    },
    set_cover_tilt_position: {
      fields: {
        tilt_position: {
          required: true,
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
      },
      target: { entity: { domain: "cover", supported_features: [128] } },
    },
    stop_cover_tilt: {
      fields: {},
      target: { entity: { domain: "cover", supported_features: [64] } },
    },
  },
  device_tracker: {
    see: {
      fields: {
        mac: { example: "FF:FF:FF:FF:FF:FF", selector: { text: null } },
        dev_id: { example: "phonedave", selector: { text: null } },
        host_name: { example: "Dave", selector: { text: null } },
        location_name: { example: "home", selector: { text: null } },
        gps: { example: "[51.509802, -0.086692]", selector: { object: null } },
        gps_accuracy: {
          selector: {
            number: { min: 0, mode: "box", unit_of_measurement: "m" },
          },
        },
        battery: {
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
      },
    },
  },
  fan: {
    set_preset_mode: {
      fields: {
        preset_mode: {
          required: true,
          example: "auto",
          selector: { state: { attribute: "preset_mode" } },
        },
      },
      target: { entity: { domain: "fan", supported_features: [8] } },
    },
    set_percentage: {
      fields: {
        percentage: {
          required: true,
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
      },
      target: { entity: { domain: "fan", supported_features: [1] } },
    },
    turn_on: {
      fields: {
        percentage: {
          filter: { supported_features: [1] },
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
        preset_mode: {
          example: "auto",
          filter: { supported_features: [8] },
          selector: { state: { attribute: "preset_mode" } },
        },
      },
      target: { entity: { domain: "fan", supported_features: [32] } },
    },
    turn_off: {
      fields: {},
      target: { entity: { domain: "fan", supported_features: [16] } },
    },
    oscillate: {
      fields: { oscillating: { required: true, selector: { boolean: null } } },
      target: { entity: { domain: "fan", supported_features: [2] } },
    },
    toggle: { fields: {}, target: { entity: { domain: "fan" } } },
    set_direction: {
      fields: {
        direction: {
          required: true,
          selector: {
            select: {
              options: ["forward", "reverse"],
              translation_key: "direction",
            },
          },
        },
      },
      target: { entity: { domain: "fan", supported_features: [4] } },
    },
    increase_speed: {
      fields: {
        additional_fields: {
          collapsed: true,
          fields: {
            percentage_step: {
              required: false,
              selector: {
                number: { min: 0, max: 100, unit_of_measurement: "%" },
              },
            },
          },
        },
      },
      target: { entity: { domain: "fan", supported_features: [1] } },
    },
    decrease_speed: {
      fields: {
        additional_fields: {
          collapsed: true,
          fields: {
            percentage_step: {
              required: false,
              selector: {
                number: { min: 0, max: 100, unit_of_measurement: "%" },
              },
            },
          },
        },
      },
      target: { entity: { domain: "fan", supported_features: [1] } },
    },
  },
  frontend: {
    set_theme: {
      fields: {
        name: {
          required: false,
          example: "default",
          selector: { theme: { include_default: true } },
        },
        name_dark: {
          required: false,
          example: "default",
          selector: { theme: { include_default: true } },
        },
      },
    },
    reload_themes: { fields: {} },
  },
  group: {
    reload: { fields: {} },
    set: {
      fields: {
        object_id: {
          required: true,
          example: "test_group",
          selector: { text: null },
        },
        name: { example: "My test group", selector: { text: null } },
        icon: { example: "mdi:camera", selector: { icon: null } },
        entities: {
          example: "domain.entity_id1, domain.entity_id2",
          selector: { entity: { multiple: true } },
        },
        add_entities: {
          example: "domain.entity_id1, domain.entity_id2",
          selector: { entity: { multiple: true } },
        },
        remove_entities: {
          example: "domain.entity_id1, domain.entity_id2",
          selector: { entity: { multiple: true } },
        },
        all: { selector: { boolean: null } },
      },
    },
    remove: {
      fields: {
        object_id: {
          required: true,
          example: "test_group",
          selector: { object: null },
        },
      },
    },
  },
  homeassistant: {
    check_config: { fields: {} },
    reload_core_config: { fields: {} },
    restart: { fields: {} },
    set_location: {
      fields: {
        latitude: {
          required: true,
          example: 32.87336,
          selector: { number: { mode: "box", min: -90, max: 90, step: "any" } },
        },
        longitude: {
          required: true,
          example: 117.22743,
          selector: {
            number: { mode: "box", min: -180, max: 180, step: "any" },
          },
        },
        elevation: {
          required: false,
          example: 120,
          selector: { number: { mode: "box", step: "any" } },
        },
      },
    },
    stop: { fields: {} },
    toggle: { fields: {}, target: {} },
    turn_on: { fields: {}, target: {} },
    turn_off: { fields: {}, target: {} },
    update_entity: {
      fields: {
        entity_id: { required: true, selector: { entity: { multiple: true } } },
      },
    },
    reload_custom_templates: { fields: {} },
    reload_config_entry: {
      fields: {
        entry_id: { required: true, selector: { config_entry: null } },
      },
    },
    save_persistent_states: { fields: {} },
    reload_all: { fields: {} },
  },
  humidifier: {
    set_mode: {
      fields: {
        mode: {
          required: true,
          example: "away",
          selector: { state: { attribute: "mode" } },
        },
      },
      target: { entity: { domain: "humidifier", supported_features: [1] } },
    },
    set_humidity: {
      fields: {
        humidity: {
          required: true,
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
      },
      target: { entity: { domain: "humidifier" } },
    },
    turn_on: { fields: {}, target: { entity: { domain: "humidifier" } } },
    turn_off: { fields: {}, target: { entity: { domain: "humidifier" } } },
    toggle: { fields: {}, target: { entity: { domain: "humidifier" } } },
  },
  image_processing: {
    scan: { fields: {}, target: { entity: { domain: "image_processing" } } },
  },
  input_boolean: {
    toggle: { fields: {}, target: { entity: { domain: "input_boolean" } } },
    turn_off: { fields: {}, target: { entity: { domain: "input_boolean" } } },
    turn_on: { fields: {}, target: { entity: { domain: "input_boolean" } } },
    reload: { fields: {} },
  },
  input_button: {
    press: { fields: {}, target: { entity: { domain: "input_button" } } },
    reload: { fields: {} },
  },
  input_datetime: {
    set_datetime: {
      fields: {
        date: { example: '"2019-04-20"', selector: { text: null } },
        time: { example: '"05:04:20"', selector: { time: null } },
        datetime: {
          example: '"2019-04-20 05:04:20"',
          selector: { text: null },
        },
        timestamp: {
          selector: {
            number: { min: 0, max: 9223372036854776000, mode: "box" },
          },
        },
      },
      target: { entity: { domain: "input_datetime" } },
    },
    reload: { fields: {} },
  },
  input_number: {
    decrement: { fields: {}, target: { entity: { domain: "input_number" } } },
    increment: { fields: {}, target: { entity: { domain: "input_number" } } },
    set_value: {
      fields: {
        value: {
          required: true,
          selector: {
            number: {
              min: 0,
              max: 9223372036854776000,
              step: 0.001,
              mode: "box",
            },
          },
        },
      },
      target: { entity: { domain: "input_number" } },
    },
    reload: { fields: {} },
  },
  input_select: {
    select_next: {
      fields: { cycle: { default: true, selector: { boolean: null } } },
      target: { entity: { domain: "input_select" } },
    },
    select_option: {
      fields: {
        option: {
          required: true,
          example: '"Item A"',
          selector: { state: { hide_states: ["unavailable", "unknown"] } },
        },
      },
      target: { entity: { domain: "input_select" } },
    },
    select_previous: {
      fields: { cycle: { default: true, selector: { boolean: null } } },
      target: { entity: { domain: "input_select" } },
    },
    select_first: {
      fields: {},
      target: { entity: { domain: "input_select" } },
    },
    select_last: { fields: {}, target: { entity: { domain: "input_select" } } },
    set_options: {
      fields: {
        options: {
          required: true,
          example: '["Item A", "Item B", "Item C"]',
          selector: { text: { multiple: true } },
        },
      },
      target: { entity: { domain: "input_select" } },
    },
    reload: { fields: {} },
  },
  input_text: {
    set_value: {
      fields: {
        value: {
          required: true,
          example: "This is an example text",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "input_text" } },
    },
    reload: { fields: {} },
  },
  lawn_mower: {
    start_mowing: {
      fields: {},
      target: { entity: { domain: "lawn_mower", supported_features: [1] } },
    },
    dock: {
      fields: {},
      target: { entity: { domain: "lawn_mower", supported_features: [4] } },
    },
    pause: {
      fields: {},
      target: { entity: { domain: "lawn_mower", supported_features: [2] } },
    },
    stop: {
      fields: {},
      target: { entity: { domain: "lawn_mower", supported_features: [8] } },
    },
  },
  light: {
    turn_on: {
      fields: {
        transition: {
          filter: { supported_features: [32] },
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
        rgb_color: {
          filter: {
            attribute: {
              supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
            },
          },
          example: "[255, 100, 100]",
          selector: { color_rgb: null },
        },
        color_temp_kelvin: {
          filter: {
            attribute: {
              supported_color_modes: [
                "color_temp",
                "hs",
                "xy",
                "rgb",
                "rgbw",
                "rgbww",
              ],
            },
          },
          selector: { color_temp: { unit: "kelvin", min: 2000, max: 6500 } },
        },
        brightness_pct: {
          filter: {
            attribute: {
              supported_color_modes: [
                "brightness",
                "color_temp",
                "hs",
                "xy",
                "rgb",
                "rgbw",
                "rgbww",
              ],
            },
          },
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
        brightness_step_pct: {
          filter: {
            attribute: {
              supported_color_modes: [
                "brightness",
                "color_temp",
                "hs",
                "xy",
                "rgb",
                "rgbw",
                "rgbww",
              ],
            },
          },
          selector: {
            number: { min: -100, max: 100, unit_of_measurement: "%" },
          },
        },
        effect: {
          filter: { supported_features: [4] },
          selector: { state: { attribute: "effect" } },
        },
        additional_fields: {
          collapsed: true,
          fields: {
            rgbw_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[255, 100, 100, 50]",
              selector: { object: null },
            },
            rgbww_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[255, 100, 100, 50, 70]",
              selector: { object: null },
            },
            color_name: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              selector: {
                select: {
                  translation_key: "color_name",
                  options: [
                    "homeassistant",
                    "aliceblue",
                    "antiquewhite",
                    "aqua",
                    "aquamarine",
                    "azure",
                    "beige",
                    "bisque",
                    "blanchedalmond",
                    "blue",
                    "blueviolet",
                    "brown",
                    "burlywood",
                    "cadetblue",
                    "chartreuse",
                    "chocolate",
                    "coral",
                    "cornflowerblue",
                    "cornsilk",
                    "crimson",
                    "cyan",
                    "darkblue",
                    "darkcyan",
                    "darkgoldenrod",
                    "darkgray",
                    "darkgreen",
                    "darkgrey",
                    "darkkhaki",
                    "darkmagenta",
                    "darkolivegreen",
                    "darkorange",
                    "darkorchid",
                    "darkred",
                    "darksalmon",
                    "darkseagreen",
                    "darkslateblue",
                    "darkslategray",
                    "darkslategrey",
                    "darkturquoise",
                    "darkviolet",
                    "deeppink",
                    "deepskyblue",
                    "dimgray",
                    "dimgrey",
                    "dodgerblue",
                    "firebrick",
                    "floralwhite",
                    "forestgreen",
                    "fuchsia",
                    "gainsboro",
                    "ghostwhite",
                    "gold",
                    "goldenrod",
                    "gray",
                    "green",
                    "greenyellow",
                    "grey",
                    "honeydew",
                    "hotpink",
                    "indianred",
                    "indigo",
                    "ivory",
                    "khaki",
                    "lavender",
                    "lavenderblush",
                    "lawngreen",
                    "lemonchiffon",
                    "lightblue",
                    "lightcoral",
                    "lightcyan",
                    "lightgoldenrodyellow",
                    "lightgray",
                    "lightgreen",
                    "lightgrey",
                    "lightpink",
                    "lightsalmon",
                    "lightseagreen",
                    "lightskyblue",
                    "lightslategray",
                    "lightslategrey",
                    "lightsteelblue",
                    "lightyellow",
                    "lime",
                    "limegreen",
                    "linen",
                    "magenta",
                    "maroon",
                    "mediumaquamarine",
                    "mediumblue",
                    "mediumorchid",
                    "mediumpurple",
                    "mediumseagreen",
                    "mediumslateblue",
                    "mediumspringgreen",
                    "mediumturquoise",
                    "mediumvioletred",
                    "midnightblue",
                    "mintcream",
                    "mistyrose",
                    "moccasin",
                    "navajowhite",
                    "navy",
                    "navyblue",
                    "oldlace",
                    "olive",
                    "olivedrab",
                    "orange",
                    "orangered",
                    "orchid",
                    "palegoldenrod",
                    "palegreen",
                    "paleturquoise",
                    "palevioletred",
                    "papayawhip",
                    "peachpuff",
                    "peru",
                    "pink",
                    "plum",
                    "powderblue",
                    "purple",
                    "red",
                    "rosybrown",
                    "royalblue",
                    "saddlebrown",
                    "salmon",
                    "sandybrown",
                    "seagreen",
                    "seashell",
                    "sienna",
                    "silver",
                    "skyblue",
                    "slateblue",
                    "slategray",
                    "slategrey",
                    "snow",
                    "springgreen",
                    "steelblue",
                    "tan",
                    "teal",
                    "thistle",
                    "tomato",
                    "turquoise",
                    "violet",
                    "wheat",
                    "white",
                    "whitesmoke",
                    "yellow",
                    "yellowgreen",
                  ],
                },
              },
            },
            hs_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[300, 70]",
              selector: { object: null },
            },
            xy_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[0.52, 0.43]",
              selector: { object: null },
            },
            brightness: {
              filter: {
                attribute: {
                  supported_color_modes: [
                    "brightness",
                    "color_temp",
                    "hs",
                    "xy",
                    "rgb",
                    "rgbw",
                    "rgbww",
                  ],
                },
              },
              selector: { number: { min: 0, max: 255 } },
            },
            brightness_step: {
              filter: {
                attribute: {
                  supported_color_modes: [
                    "brightness",
                    "color_temp",
                    "hs",
                    "xy",
                    "rgb",
                    "rgbw",
                    "rgbww",
                  ],
                },
              },
              selector: { number: { min: -225, max: 255 } },
            },
            white: {
              filter: { attribute: { supported_color_modes: ["white"] } },
              selector: { constant: { value: true, label: "Enabled" } },
            },
            profile: { example: "relax", selector: { text: null } },
            flash: {
              filter: { supported_features: [8] },
              selector: {
                select: {
                  translation_key: "flash",
                  options: ["long", "short"],
                },
              },
            },
          },
        },
      },
      target: { entity: { domain: "light" } },
    },
    turn_off: {
      fields: {
        transition: {
          filter: { supported_features: [32] },
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
        additional_fields: {
          collapsed: true,
          fields: {
            flash: {
              filter: { supported_features: [8] },
              selector: {
                select: {
                  translation_key: "flash",
                  options: ["long", "short"],
                },
              },
            },
          },
        },
      },
      target: { entity: { domain: "light" } },
    },
    toggle: {
      fields: {
        transition: {
          filter: { supported_features: [32] },
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
        rgb_color: {
          filter: {
            attribute: {
              supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
            },
          },
          example: "[255, 100, 100]",
          selector: { color_rgb: null },
        },
        color_temp_kelvin: {
          filter: {
            attribute: {
              supported_color_modes: [
                "color_temp",
                "hs",
                "xy",
                "rgb",
                "rgbw",
                "rgbww",
              ],
            },
          },
          selector: { color_temp: { unit: "kelvin", min: 2000, max: 6500 } },
        },
        brightness_pct: {
          filter: {
            attribute: {
              supported_color_modes: [
                "brightness",
                "color_temp",
                "hs",
                "xy",
                "rgb",
                "rgbw",
                "rgbww",
              ],
            },
          },
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
        effect: {
          filter: { supported_features: [4] },
          selector: { state: { attribute: "effect" } },
        },
        additional_fields: {
          collapsed: true,
          fields: {
            rgbw_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[255, 100, 100, 50]",
              selector: { object: null },
            },
            rgbww_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[255, 100, 100, 50, 70]",
              selector: { object: null },
            },
            color_name: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              selector: {
                select: {
                  translation_key: "color_name",
                  options: [
                    "homeassistant",
                    "aliceblue",
                    "antiquewhite",
                    "aqua",
                    "aquamarine",
                    "azure",
                    "beige",
                    "bisque",
                    "blanchedalmond",
                    "blue",
                    "blueviolet",
                    "brown",
                    "burlywood",
                    "cadetblue",
                    "chartreuse",
                    "chocolate",
                    "coral",
                    "cornflowerblue",
                    "cornsilk",
                    "crimson",
                    "cyan",
                    "darkblue",
                    "darkcyan",
                    "darkgoldenrod",
                    "darkgray",
                    "darkgreen",
                    "darkgrey",
                    "darkkhaki",
                    "darkmagenta",
                    "darkolivegreen",
                    "darkorange",
                    "darkorchid",
                    "darkred",
                    "darksalmon",
                    "darkseagreen",
                    "darkslateblue",
                    "darkslategray",
                    "darkslategrey",
                    "darkturquoise",
                    "darkviolet",
                    "deeppink",
                    "deepskyblue",
                    "dimgray",
                    "dimgrey",
                    "dodgerblue",
                    "firebrick",
                    "floralwhite",
                    "forestgreen",
                    "fuchsia",
                    "gainsboro",
                    "ghostwhite",
                    "gold",
                    "goldenrod",
                    "gray",
                    "green",
                    "greenyellow",
                    "grey",
                    "honeydew",
                    "hotpink",
                    "indianred",
                    "indigo",
                    "ivory",
                    "khaki",
                    "lavender",
                    "lavenderblush",
                    "lawngreen",
                    "lemonchiffon",
                    "lightblue",
                    "lightcoral",
                    "lightcyan",
                    "lightgoldenrodyellow",
                    "lightgray",
                    "lightgreen",
                    "lightgrey",
                    "lightpink",
                    "lightsalmon",
                    "lightseagreen",
                    "lightskyblue",
                    "lightslategray",
                    "lightslategrey",
                    "lightsteelblue",
                    "lightyellow",
                    "lime",
                    "limegreen",
                    "linen",
                    "magenta",
                    "maroon",
                    "mediumaquamarine",
                    "mediumblue",
                    "mediumorchid",
                    "mediumpurple",
                    "mediumseagreen",
                    "mediumslateblue",
                    "mediumspringgreen",
                    "mediumturquoise",
                    "mediumvioletred",
                    "midnightblue",
                    "mintcream",
                    "mistyrose",
                    "moccasin",
                    "navajowhite",
                    "navy",
                    "navyblue",
                    "oldlace",
                    "olive",
                    "olivedrab",
                    "orange",
                    "orangered",
                    "orchid",
                    "palegoldenrod",
                    "palegreen",
                    "paleturquoise",
                    "palevioletred",
                    "papayawhip",
                    "peachpuff",
                    "peru",
                    "pink",
                    "plum",
                    "powderblue",
                    "purple",
                    "red",
                    "rosybrown",
                    "royalblue",
                    "saddlebrown",
                    "salmon",
                    "sandybrown",
                    "seagreen",
                    "seashell",
                    "sienna",
                    "silver",
                    "skyblue",
                    "slateblue",
                    "slategray",
                    "slategrey",
                    "snow",
                    "springgreen",
                    "steelblue",
                    "tan",
                    "teal",
                    "thistle",
                    "tomato",
                    "turquoise",
                    "violet",
                    "wheat",
                    "white",
                    "whitesmoke",
                    "yellow",
                    "yellowgreen",
                  ],
                },
              },
            },
            hs_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[300, 70]",
              selector: { object: null },
            },
            xy_color: {
              filter: {
                attribute: {
                  supported_color_modes: ["hs", "xy", "rgb", "rgbw", "rgbww"],
                },
              },
              example: "[0.52, 0.43]",
              selector: { object: null },
            },
            brightness: {
              filter: {
                attribute: {
                  supported_color_modes: [
                    "brightness",
                    "color_temp",
                    "hs",
                    "xy",
                    "rgb",
                    "rgbw",
                    "rgbww",
                  ],
                },
              },
              selector: { number: { min: 0, max: 255 } },
            },
            white: {
              filter: { attribute: { supported_color_modes: ["white"] } },
              selector: { constant: { value: true, label: "Enabled" } },
            },
            profile: { example: "relax", selector: { text: null } },
            flash: {
              filter: { supported_features: [8] },
              selector: {
                select: {
                  translation_key: "flash",
                  options: ["long", "short"],
                },
              },
            },
          },
        },
      },
      target: { entity: { domain: "light" } },
    },
  },
  lock: {
    lock: {
      fields: { code: { example: 1234, selector: { text: null } } },
      target: { entity: { domain: "lock" } },
    },
    open: {
      fields: { code: { example: 1234, selector: { text: null } } },
      target: { entity: { domain: "lock", supported_features: [1] } },
    },
    unlock: {
      fields: { code: { example: 1234, selector: { text: null } } },
      target: { entity: { domain: "lock" } },
    },
  },
  logger: {
    set_default_level: {
      fields: {
        level: {
          selector: {
            select: {
              options: [
                "debug",
                "info",
                "warning",
                "error",
                "fatal",
                "critical",
              ],
              translation_key: "level",
            },
          },
        },
      },
    },
    set_level: { fields: {} },
  },
  media_player: {
    turn_on: {
      fields: {},
      target: { entity: { domain: "media_player", supported_features: [128] } },
    },
    turn_off: {
      fields: {},
      target: { entity: { domain: "media_player", supported_features: [256] } },
    },
    toggle: {
      fields: {},
      target: { entity: { domain: "media_player", supported_features: [384] } },
    },
    volume_up: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [4, 1024] },
      },
    },
    volume_down: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [4, 1024] },
      },
    },
    volume_mute: {
      fields: {
        is_volume_muted: { required: true, selector: { boolean: null } },
      },
      target: { entity: { domain: "media_player", supported_features: [8] } },
    },
    volume_set: {
      fields: {
        volume_level: {
          required: true,
          selector: { number: { min: 0, max: 1, step: 0.01 } },
        },
      },
      target: { entity: { domain: "media_player", supported_features: [4] } },
    },
    media_play_pause: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [16385] },
      },
    },
    media_play: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [16384] },
      },
    },
    media_pause: {
      fields: {},
      target: { entity: { domain: "media_player", supported_features: [1] } },
    },
    media_stop: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [4096] },
      },
    },
    media_next_track: {
      fields: {},
      target: { entity: { domain: "media_player", supported_features: [32] } },
    },
    media_previous_track: {
      fields: {},
      target: { entity: { domain: "media_player", supported_features: [16] } },
    },
    media_seek: {
      fields: {
        seek_position: {
          required: true,
          selector: {
            number: {
              min: 0,
              max: 9223372036854776000,
              step: 0.01,
              mode: "box",
            },
          },
        },
      },
      target: { entity: { domain: "media_player", supported_features: [2] } },
    },
    play_media: {
      fields: {
        media: {
          required: true,
          selector: { media: null },
          example:
            '{"media_content_id": "https://home-assistant.io/images/cast/splash.png", "media_content_type": "music"}',
        },
        enqueue: {
          filter: { supported_features: [2097152] },
          required: false,
          selector: {
            select: {
              options: ["play", "next", "add", "replace"],
              translation_key: "enqueue",
            },
          },
        },
        announce: {
          filter: { supported_features: [1048576] },
          required: false,
          example: "true",
          selector: { boolean: null },
        },
      },
      target: { entity: { domain: "media_player", supported_features: [512] } },
    },
    browse_media: {
      fields: {
        media_content_type: {
          required: false,
          example: "music",
          selector: { text: null },
        },
        media_content_id: {
          required: false,
          example: "A:ALBUMARTIST/Beatles",
          selector: { text: null },
        },
      },
      target: {
        entity: { domain: "media_player", supported_features: [131072] },
      },
      response: { optional: false },
    },
    search_media: {
      fields: {
        search_query: {
          required: true,
          example: "Beatles",
          selector: { text: null },
        },
        media_content_type: {
          required: false,
          example: "music",
          selector: { text: null },
        },
        media_content_id: {
          required: false,
          example: "A:ALBUMARTIST/Beatles",
          selector: { text: null },
        },
        media_filter_classes: {
          required: false,
          example: ["album", "artist"],
          selector: { text: { multiple: true } },
        },
      },
      target: {
        entity: { domain: "media_player", supported_features: [4194304] },
      },
      response: { optional: false },
    },
    select_source: {
      fields: {
        source: {
          required: true,
          example: "video1",
          selector: { state: { attribute: "source" } },
        },
      },
      target: {
        entity: { domain: "media_player", supported_features: [2048] },
      },
    },
    select_sound_mode: {
      fields: {
        sound_mode: {
          example: "Music",
          selector: { state: { attribute: "sound_mode" } },
        },
      },
      target: {
        entity: { domain: "media_player", supported_features: [65536] },
      },
    },
    clear_playlist: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [8192] },
      },
    },
    shuffle_set: {
      fields: { shuffle: { required: true, selector: { boolean: null } } },
      target: {
        entity: { domain: "media_player", supported_features: [32768] },
      },
    },
    repeat_set: {
      fields: {
        repeat: {
          required: true,
          selector: {
            select: {
              options: ["off", "all", "one"],
              translation_key: "repeat",
            },
          },
        },
      },
      target: {
        entity: { domain: "media_player", supported_features: [262144] },
      },
    },
    join: {
      fields: {
        group_members: {
          required: true,
          example:
            "- media_player.multiroom_player2\n- media_player.multiroom_player3\n",
          selector: { entity: { multiple: true, domain: "media_player" } },
        },
      },
      target: {
        entity: { domain: "media_player", supported_features: [524288] },
      },
    },
    unjoin: {
      fields: {},
      target: {
        entity: { domain: "media_player", supported_features: [524288] },
      },
    },
  },
  notify: {
    notify: {
      fields: {
        message: {
          required: true,
          example: "The garage door has been open for 10 minutes.",
          selector: { text: null },
        },
        title: { example: "Your Garage Door Friend", selector: { text: null } },
        target: { example: "platform specific", selector: { object: null } },
        data: { example: "platform specific", selector: { object: null } },
      },
    },
    send_message: {
      fields: {
        message: { required: true, selector: { text: null } },
        title: {
          required: false,
          selector: { text: null },
          filter: { supported_features: [1] },
        },
      },
      target: { entity: { domain: "notify" } },
    },
    persistent_notification: {
      fields: {
        message: {
          required: true,
          example: "The garage door has been open for 10 minutes.",
          selector: { text: null },
        },
        title: { example: "Your Garage Door Friend", selector: { text: null } },
        data: { example: "platform specific", selector: { object: null } },
      },
    },
  },
  number: {
    set_value: {
      fields: {
        value: { example: 42, required: true, selector: { text: null } },
      },
      target: { entity: { domain: "number" } },
    },
  },
  persistent_notification: {
    create: {
      fields: {
        message: {
          required: true,
          example: "Please check your configuration.yaml.",
          selector: { text: null },
        },
        title: { example: "Test notification", selector: { text: null } },
        notification_id: { example: 1234, selector: { text: null } },
      },
    },
    dismiss: {
      fields: {
        notification_id: {
          required: true,
          example: 1234,
          selector: { text: null },
        },
      },
    },
    dismiss_all: { fields: {} },
  },
  person: { reload: { fields: {} } },
  recorder: {
    purge: {
      fields: {
        keep_days: {
          selector: {
            number: { min: 0, max: 365, unit_of_measurement: "days" },
          },
        },
        repack: { default: false, selector: { boolean: null } },
        apply_filter: { default: false, selector: { boolean: null } },
      },
    },
    purge_entities: {
      fields: {
        entity_id: {
          required: false,
          selector: { entity: { multiple: true } },
        },
        domains: {
          example: "sun",
          required: false,
          selector: { object: null },
        },
        entity_globs: {
          example: "domain*.object_id*",
          required: false,
          selector: { object: null },
        },
        keep_days: {
          default: 0,
          selector: {
            number: { min: 0, max: 365, unit_of_measurement: "days" },
          },
        },
      },
    },
    disable: { fields: {} },
    enable: { fields: {} },
    get_statistics: {
      fields: {
        start_time: {
          required: true,
          example: "2025-01-01 00:00:00",
          selector: { datetime: null },
        },
        end_time: {
          required: false,
          example: "2025-01-02 00:00:00",
          selector: { datetime: null },
        },
        statistic_ids: {
          required: true,
          example: ["sensor.energy_consumption", "sensor.temperature"],
          selector: { statistic: { multiple: true } },
        },
        period: {
          required: true,
          example: "hour",
          selector: {
            select: {
              options: ["5minute", "hour", "day", "week", "month", "year"],
            },
          },
        },
        types: {
          required: true,
          example: ["mean", "sum"],
          selector: {
            select: {
              options: [
                "change",
                "last_reset",
                "max",
                "mean",
                "min",
                "state",
                "sum",
              ],
              multiple: true,
            },
          },
        },
        units: {
          required: false,
          example: { energy: "kWh", temperature: "°C" },
          selector: { object: null },
        },
      },
      response: { optional: false },
    },
  },
  remote: {
    turn_on: {
      fields: {
        activity: {
          example: "BedroomTV",
          filter: { supported_features: [4] },
          selector: { text: null },
        },
      },
      target: { entity: { domain: "remote" } },
    },
    toggle: { fields: {}, target: { entity: { domain: "remote" } } },
    turn_off: { fields: {}, target: { entity: { domain: "remote" } } },
    send_command: {
      fields: {
        device: { example: "32756745", selector: { text: null } },
        command: {
          required: true,
          example: "Play",
          selector: { object: null },
        },
        num_repeats: { default: 1, selector: { number: { min: 0, max: 255 } } },
        delay_secs: {
          default: 0.4,
          selector: {
            number: {
              min: 0,
              max: 60,
              step: 0.1,
              unit_of_measurement: "seconds",
            },
          },
        },
        hold_secs: {
          default: 0,
          selector: {
            number: {
              min: 0,
              max: 60,
              step: 0.1,
              unit_of_measurement: "seconds",
            },
          },
        },
      },
      target: { entity: { domain: "remote" } },
    },
    learn_command: {
      fields: {
        device: { example: "television", selector: { text: null } },
        command: { example: "Turn on", selector: { object: null } },
        command_type: {
          default: "ir",
          selector: { select: { options: ["ir", "rf"] } },
        },
        alternative: { selector: { boolean: null } },
        timeout: {
          selector: {
            number: {
              min: 0,
              max: 60,
              step: 5,
              unit_of_measurement: "seconds",
            },
          },
        },
      },
      target: { entity: { domain: "remote" } },
    },
    delete_command: {
      fields: {
        device: { example: "television", selector: { text: null } },
        command: {
          required: true,
          example: "Mute",
          selector: { object: null },
        },
      },
      target: { entity: { domain: "remote" } },
    },
  },
  scene: {
    turn_on: {
      fields: {
        transition: {
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
      },
      target: { entity: { domain: "scene" } },
    },
    reload: { fields: {} },
    apply: {
      fields: {
        entities: {
          required: true,
          example:
            'light.kitchen: "on"\nlight.ceiling:\n  state: "on"\n  brightness: 80\n',
          selector: { object: null },
        },
        transition: {
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
      },
    },
    create: {
      fields: {
        scene_id: {
          required: true,
          example: "all_lights",
          selector: { text: null },
        },
        entities: {
          example:
            'light.tv_back_light: "on"\nlight.ceiling:\n  state: "on"\n  brightness: 200\n',
          selector: { object: null },
        },
        snapshot_entities: {
          example: "- light.ceiling\n- light.kitchen\n",
          selector: { entity: { multiple: true } },
        },
      },
    },
    delete: {
      fields: {},
      target: { entity: [{ integration: "homeassistant", domain: "scene" }] },
    },
  },
  schedule: {
    reload: { fields: {} },
    get_schedule: {
      fields: {},
      target: { entity: { domain: "schedule" } },
      response: { optional: false },
    },
  },
  script: {
    reload: { fields: {} },
    turn_on: { fields: {}, target: { entity: { domain: "script" } } },
    turn_off: { fields: {}, target: { entity: { domain: "script" } } },
    toggle: { fields: {}, target: { entity: { domain: "script" } } },
  },
  select: {
    select_first: { fields: {}, target: { entity: { domain: "select" } } },
    select_last: { fields: {}, target: { entity: { domain: "select" } } },
    select_next: {
      fields: { cycle: { default: true, selector: { boolean: null } } },
      target: { entity: { domain: "select" } },
    },
    select_option: {
      fields: {
        option: {
          required: true,
          example: '"Item A"',
          selector: { state: { hide_states: ["unavailable", "unknown"] } },
        },
      },
      target: { entity: { domain: "select" } },
    },
    select_previous: {
      fields: { cycle: { default: true, selector: { boolean: null } } },
      target: { entity: { domain: "select" } },
    },
  },
  siren: {
    turn_on: {
      fields: {
        tone: {
          example: "fire",
          filter: { supported_features: [4] },
          required: false,
          selector: { text: null },
        },
        volume_level: {
          example: 0.5,
          filter: { supported_features: [8] },
          required: false,
          selector: { number: { min: 0, max: 1, step: 0.05 } },
        },
        duration: {
          example: 15,
          filter: { supported_features: [16] },
          required: false,
          selector: { text: null },
        },
      },
      target: { entity: { domain: "siren", supported_features: [1] } },
    },
    turn_off: {
      fields: {},
      target: { entity: { domain: "siren", supported_features: [2] } },
    },
    toggle: {
      fields: {},
      target: { entity: { domain: "siren", supported_features: [3] } },
    },
  },
  switch: {
    turn_on: { fields: {}, target: { entity: { domain: "switch" } } },
    turn_off: { fields: {}, target: { entity: { domain: "switch" } } },
    toggle: { fields: {}, target: { entity: { domain: "switch" } } },
  },
  system_log: {
    clear: { fields: {} },
    write: {
      fields: {
        message: {
          required: true,
          example: "Something went wrong",
          selector: { text: null },
        },
        level: {
          default: "error",
          selector: {
            select: {
              options: ["debug", "info", "warning", "error", "critical"],
              translation_key: "level",
            },
          },
        },
        logger: { example: "mycomponent.myplatform", selector: { text: null } },
      },
    },
  },
  text: {
    set_value: {
      fields: {
        value: {
          required: true,
          example: "Hello world!",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "text" } },
    },
  },
  timer: {
    start: {
      fields: {
        duration: { example: "00:01:00 or 60", selector: { duration: null } },
      },
      target: { entity: { domain: "timer" } },
    },
    pause: { fields: {}, target: { entity: { domain: "timer" } } },
    cancel: { fields: {}, target: { entity: { domain: "timer" } } },
    finish: { fields: {}, target: { entity: { domain: "timer" } } },
    change: {
      fields: {
        duration: {
          default: 0,
          required: true,
          example: "00:01:00, 60 or -60",
          selector: { duration: { allow_negative: true } },
        },
      },
      target: { entity: { domain: "timer" } },
    },
    reload: { fields: {} },
  },
  todo: {
    get_items: {
      fields: {
        status: {
          example: "needs_action",
          default: "needs_action",
          selector: {
            select: {
              translation_key: "status",
              options: ["needs_action", "completed"],
              multiple: true,
            },
          },
        },
      },
      target: { entity: { domain: "todo" } },
      response: { optional: false },
    },
    add_item: {
      fields: {
        item: {
          required: true,
          example: "Submit income tax return",
          selector: { text: null },
        },
        due_date: {
          filter: { supported_features: [16] },
          example: "2023-11-17",
          selector: { date: null },
        },
        due_datetime: {
          filter: { supported_features: [32] },
          example: "2023-11-17 13:30:00",
          selector: { datetime: null },
        },
        description: {
          filter: { supported_features: [64] },
          example:
            "A more complete description of the to-do item than that provided by the summary.",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "todo", supported_features: [1] } },
    },
    update_item: {
      fields: {
        item: {
          required: true,
          example: "Submit income tax return",
          selector: { text: null },
        },
        rename: { example: "Something else", selector: { text: null } },
        status: {
          example: "needs_action",
          selector: {
            select: {
              translation_key: "status",
              options: ["needs_action", "completed"],
            },
          },
        },
        due_date: {
          filter: { supported_features: [16] },
          example: "2023-11-17",
          selector: { date: null },
        },
        due_datetime: {
          filter: { supported_features: [32] },
          example: "2023-11-17 13:30:00",
          selector: { datetime: null },
        },
        description: {
          filter: { supported_features: [64] },
          example:
            "A more complete description of the to-do item than that provided by the summary.",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "todo", supported_features: [4] } },
    },
    remove_item: {
      fields: {
        item: {
          required: true,
          example: "Submit income tax return",
          selector: { text: null },
        },
      },
      target: { entity: { domain: "todo", supported_features: [2] } },
    },
    remove_completed_items: {
      fields: {},
      target: { entity: { domain: "todo", supported_features: [2] } },
    },
  },
  tts: {
    say: {
      fields: {
        entity_id: {
          required: true,
          selector: { entity: { domain: "media_player" } },
        },
        message: {
          example: "My name is hanna",
          required: true,
          selector: { text: null },
        },
        cache: { default: false, selector: { boolean: null } },
        language: { example: "ru", selector: { text: null } },
        options: { example: "platform specific", selector: { object: null } },
      },
    },
    speak: {
      fields: {
        media_player_entity_id: {
          required: true,
          selector: { entity: { domain: "media_player" } },
        },
        message: {
          example: "My name is hanna",
          required: true,
          selector: { text: null },
        },
        cache: { default: true, selector: { boolean: null } },
        language: { example: "ru", selector: { text: null } },
        options: { example: "platform specific", selector: { object: null } },
      },
      target: { entity: { domain: "tts" } },
    },
    clear_cache: { fields: {} },
  },
  update: {
    install: {
      fields: {
        version: {
          required: false,
          example: "1.0.0",
          selector: { text: null },
        },
        backup: {
          filter: { supported_features: [8] },
          required: false,
          selector: { boolean: null },
        },
      },
      target: { entity: { domain: "update" } },
    },
    skip: { fields: {}, target: { entity: { domain: "update" } } },
    clear_skipped: { fields: {}, target: { entity: { domain: "update" } } },
  },
  vacuum: {
    turn_on: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [1] } },
    },
    turn_off: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [2] } },
    },
    toggle: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [2, 1] } },
    },
    stop: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [8] } },
    },
    locate: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [512] } },
    },
    start_pause: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [4] } },
    },
    start: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [8192] } },
    },
    pause: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [4] } },
    },
    return_to_base: {
      fields: {},
      target: { entity: { domain: "vacuum", supported_features: [16] } },
    },
    clean_spot: { fields: {}, target: { entity: { domain: "vacuum" } } },
    clean_area: {
      fields: {
        cleaning_area_id: {
          required: true,
          selector: { area: { multiple: true, reorder: true } },
        },
      },
      target: { entity: { domain: "vacuum", supported_features: [16384] } },
    },
    send_command: {
      fields: {
        command: {
          required: true,
          example: "set_dnd_timer",
          selector: { text: null },
        },
        params: { example: '{ "key": "value" }', selector: { object: null } },
      },
      target: { entity: { domain: "vacuum" } },
    },
    set_fan_speed: {
      fields: {
        fan_speed: {
          required: true,
          example: "low",
          selector: { state: { attribute: "fan_speed" } },
        },
      },
      target: { entity: { domain: "vacuum" } },
    },
  },
  valve: {
    open_valve: {
      fields: {},
      target: { entity: { domain: "valve", supported_features: [1] } },
    },
    close_valve: {
      fields: {},
      target: { entity: { domain: "valve", supported_features: [2] } },
    },
    toggle: {
      fields: {},
      target: { entity: { domain: "valve", supported_features: [3] } },
    },
    set_valve_position: {
      fields: {
        position: {
          required: true,
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
      },
      target: { entity: { domain: "valve", supported_features: [4] } },
    },
    stop_valve: {
      fields: {},
      target: { entity: { domain: "valve", supported_features: [8] } },
    },
  },
  water_heater: {
    set_away_mode: {
      fields: { away_mode: { required: true, selector: { boolean: null } } },
      target: { entity: { domain: "water_heater" } },
    },
    set_temperature: {
      fields: {
        temperature: {
          required: true,
          selector: {
            number: {
              min: 0,
              max: 250,
              step: 0.5,
              mode: "box",
              unit_of_measurement: "°",
            },
          },
        },
        operation_mode: {
          example: "eco",
          selector: { state: { hide_states: ["unavailable", "unknown"] } },
        },
      },
      target: { entity: { domain: "water_heater" } },
    },
    set_operation_mode: {
      fields: {
        operation_mode: {
          required: true,
          example: "eco",
          selector: { state: { hide_states: ["unavailable", "unknown"] } },
        },
      },
      target: { entity: { domain: "water_heater" } },
    },
    turn_on: { fields: {}, target: { entity: { domain: "water_heater" } } },
    turn_off: { fields: {}, target: { entity: { domain: "water_heater" } } },
  },
  weather: {
    get_forecasts: {
      fields: {
        type: {
          required: true,
          selector: {
            select: {
              options: ["daily", "hourly", "twice_daily"],
              translation_key: "forecast_type",
            },
          },
        },
      },
      target: { entity: { domain: "weather", supported_features: [1, 2, 4] } },
      response: { optional: false },
    },
  },
  zone: { reload: { fields: {} } },
} as unknown as HassServices;

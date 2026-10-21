// This file is auto-generated from Home Assistant Core. Do not edit by hand.
// Regenerate with `script/gen_demo_core_data`.
import type { ConditionDescriptions } from "../../../src/data/condition";
import type { TriggerDescriptions } from "../../../src/data/trigger";

export const triggerDescriptions: TriggerDescriptions = {
  "air_quality.gas_detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "gas" }] },
  },
  "air_quality.gas_cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "gas" }] },
  },
  "air_quality.co_detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "carbon_monoxide" }],
    },
  },
  "air_quality.co_cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "carbon_monoxide" }],
    },
  },
  "air_quality.smoke_detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "smoke" }] },
  },
  "air_quality.smoke_cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "smoke" }] },
  },
  "air_quality.co_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "mg/m³", "μg/m³"],
              },
              { domain: "sensor", device_class: "carbon_monoxide" },
              { domain: "number", device_class: "carbon_monoxide" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "mg/m³", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "carbon_monoxide" }] },
  },
  "air_quality.co_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "mg/m³", "μg/m³"],
              },
              { domain: "sensor", device_class: "carbon_monoxide" },
              { domain: "number", device_class: "carbon_monoxide" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "mg/m³", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "carbon_monoxide" }] },
  },
  "air_quality.co2_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "ppm" },
              { domain: "sensor", device_class: "carbon_dioxide" },
              { domain: "number", device_class: "carbon_dioxide" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "ppm" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "carbon_dioxide" }] },
  },
  "air_quality.co2_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "ppm" },
              { domain: "sensor", device_class: "carbon_dioxide" },
              { domain: "number", device_class: "carbon_dioxide" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "ppm" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "carbon_dioxide" }] },
  },
  "air_quality.pm1_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm1" },
              { domain: "number", device_class: "pm1" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm1" }] },
  },
  "air_quality.pm1_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm1" },
              { domain: "number", device_class: "pm1" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm1" }] },
  },
  "air_quality.pm25_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm25" },
              { domain: "number", device_class: "pm25" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm25" }] },
  },
  "air_quality.pm25_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm25" },
              { domain: "number", device_class: "pm25" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm25" }] },
  },
  "air_quality.pm4_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm4" },
              { domain: "number", device_class: "pm4" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm4" }] },
  },
  "air_quality.pm4_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm4" },
              { domain: "number", device_class: "pm4" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm4" }] },
  },
  "air_quality.pm10_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm10" },
              { domain: "number", device_class: "pm10" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm10" }] },
  },
  "air_quality.pm10_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm10" },
              { domain: "number", device_class: "pm10" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm10" }] },
  },
  "air_quality.ozone_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "μg/m³"],
              },
              { domain: "sensor", device_class: "ozone" },
              { domain: "number", device_class: "ozone" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "ozone" }] },
  },
  "air_quality.ozone_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "μg/m³"],
              },
              { domain: "sensor", device_class: "ozone" },
              { domain: "number", device_class: "ozone" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "ozone" }] },
  },
  "air_quality.voc_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["μg/m³", "mg/m³"],
              },
              { domain: "sensor", device_class: "volatile_organic_compounds" },
              { domain: "number", device_class: "volatile_organic_compounds" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["μg/m³", "mg/m³"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "volatile_organic_compounds" },
      ],
    },
  },
  "air_quality.voc_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["μg/m³", "mg/m³"],
              },
              { domain: "sensor", device_class: "volatile_organic_compounds" },
              { domain: "number", device_class: "volatile_organic_compounds" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["μg/m³", "mg/m³"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "volatile_organic_compounds" },
      ],
    },
  },
  "air_quality.voc_ratio_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "ppm"] },
              {
                domain: "sensor",
                device_class: "volatile_organic_compounds_parts",
              },
              {
                domain: "number",
                device_class: "volatile_organic_compounds_parts",
              },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "volatile_organic_compounds_parts" },
      ],
    },
  },
  "air_quality.voc_ratio_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "ppm"] },
              {
                domain: "sensor",
                device_class: "volatile_organic_compounds_parts",
              },
              {
                domain: "number",
                device_class: "volatile_organic_compounds_parts",
              },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "volatile_organic_compounds_parts" },
      ],
    },
  },
  "air_quality.no_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "μg/m³"] },
              { domain: "sensor", device_class: "nitrogen_monoxide" },
              { domain: "number", device_class: "nitrogen_monoxide" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "μg/m³"],
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "nitrogen_monoxide" }],
    },
  },
  "air_quality.no_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "μg/m³"] },
              { domain: "sensor", device_class: "nitrogen_monoxide" },
              { domain: "number", device_class: "nitrogen_monoxide" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "μg/m³"],
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "nitrogen_monoxide" }],
    },
  },
  "air_quality.no2_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "μg/m³"],
              },
              { domain: "sensor", device_class: "nitrogen_dioxide" },
              { domain: "number", device_class: "nitrogen_dioxide" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "μg/m³"],
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "nitrogen_dioxide" }],
    },
  },
  "air_quality.no2_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "μg/m³"],
              },
              { domain: "sensor", device_class: "nitrogen_dioxide" },
              { domain: "number", device_class: "nitrogen_dioxide" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "μg/m³"],
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "nitrogen_dioxide" }],
    },
  },
  "air_quality.n2o_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "nitrous_oxide" },
              { domain: "number", device_class: "nitrous_oxide" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "nitrous_oxide" }] },
  },
  "air_quality.n2o_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "nitrous_oxide" },
              { domain: "number", device_class: "nitrous_oxide" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "nitrous_oxide" }] },
  },
  "air_quality.so2_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "μg/m³"] },
              { domain: "sensor", device_class: "sulphur_dioxide" },
              { domain: "number", device_class: "sulphur_dioxide" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "sulphur_dioxide" }] },
  },
  "air_quality.so2_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "μg/m³"] },
              { domain: "sensor", device_class: "sulphur_dioxide" },
              { domain: "number", device_class: "sulphur_dioxide" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "sulphur_dioxide" }] },
  },
  "alarm_control_panel.armed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "alarm_control_panel" } },
  },
  "alarm_control_panel.armed_away": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [2] },
    },
  },
  "alarm_control_panel.armed_home": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [1] },
    },
  },
  "alarm_control_panel.armed_night": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [4] },
    },
  },
  "alarm_control_panel.armed_vacation": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [32] },
    },
  },
  "alarm_control_panel.disarmed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "alarm_control_panel" } },
  },
  "alarm_control_panel.triggered": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "alarm_control_panel" } },
  },
  "assist_satellite.idle": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "assist_satellite.listening": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "assist_satellite.processing": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "assist_satellite.responding": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "battery.became_low": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "battery.no_longer_low": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "battery.started_charging": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery_charging" }],
      primary_entities_only: false,
    },
  },
  "battery.stopped_charging": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery_charging" }],
      primary_entities_only: false,
    },
  },
  "battery.level_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", device_class: "battery" },
              { domain: "sensor", device_class: "battery" },
            ],
            mode: "changed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "battery.level_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", device_class: "battery" },
              { domain: "sensor", device_class: "battery" },
            ],
            mode: "crossed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "button.pressed": {
    fields: {},
    target: { entity: [{ domain: "button" }, { domain: "input_button" }] },
  },
  "calendar.event_started": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
    target: { entity: { domain: "calendar" } },
  },
  "calendar.event_ended": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
    target: { entity: { domain: "calendar" } },
  },
  "climate.started_cooling": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.started_drying": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.started_heating": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.hvac_mode_changed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      hvac_mode: {
        context: { filter_target: "target" },
        required: true,
        selector: {
          state: { hide_states: ["unavailable", "unknown"], multiple: true },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.target_humidity_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "changed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.target_humidity_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "crossed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.target_temperature_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.target_temperature_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "counter.incremented": {
    fields: {},
    target: { entity: { domain: "counter" } },
  },
  "counter.decremented": {
    fields: {},
    target: { entity: { domain: "counter" } },
  },
  "counter.maximum_reached": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "counter" } },
  },
  "counter.minimum_reached": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "counter" } },
  },
  "counter.reset": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "counter" } },
  },
  "cover.awning_closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "awning" }] },
  },
  "cover.awning_opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "awning" }] },
  },
  "cover.blind_closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "blind" }] },
  },
  "cover.blind_opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "blind" }] },
  },
  "cover.curtain_closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "curtain" }] },
  },
  "cover.curtain_opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "curtain" }] },
  },
  "cover.shade_closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shade" }] },
  },
  "cover.shade_opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shade" }] },
  },
  "cover.shutter_closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shutter" }] },
  },
  "cover.shutter_opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shutter" }] },
  },
  "door.closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "door" },
        { domain: "cover", device_class: "door" },
      ],
    },
  },
  "door.opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "door" },
        { domain: "cover", device_class: "door" },
      ],
    },
  },
  "doorbell.rang": {
    fields: {},
    target: { entity: { domain: "event", device_class: "doorbell" } },
  },
  "event.received": {
    fields: {
      event_type: {
        context: { filter_target: "target" },
        required: true,
        selector: {
          state: {
            attribute: "event_type",
            hide_states: ["unavailable", "unknown"],
            multiple: true,
          },
        },
      },
    },
    target: { entity: { domain: "event" } },
  },
  "fan.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "fan" } },
  },
  "fan.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "fan" } },
  },
  "garage_door.closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "garage_door" },
        { domain: "cover", device_class: "garage" },
      ],
    },
  },
  "garage_door.opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "garage_door" },
        { domain: "cover", device_class: "garage" },
      ],
    },
  },
  "gate.closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "gate" }] },
  },
  "gate.opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "gate" }] },
  },
  "humidifier.started_drying": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.started_humidifying": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.mode_changed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      mode: {
        context: { filter_target: "target" },
        required: true,
        selector: { state: { attribute: "available_modes", multiple: true } },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidity.changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "changed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "humidity" },
        { domain: "climate" },
        { domain: "humidifier" },
        { domain: "weather" },
      ],
    },
  },
  "humidity.crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "crossed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "humidity" },
        { domain: "climate" },
        { domain: "humidifier" },
        { domain: "weather" },
      ],
    },
  },
  "illuminance.detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "light" }] },
  },
  "illuminance.cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "light" }] },
  },
  "illuminance.changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "lx" },
              { domain: "sensor", device_class: "illuminance" },
              { domain: "number", device_class: "illuminance" },
            ],
            mode: "changed",
            number: { mode: "box", unit_of_measurement: "lx" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "illuminance" }] },
  },
  "illuminance.crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "lx" },
              { domain: "sensor", device_class: "illuminance" },
              { domain: "number", device_class: "illuminance" },
            ],
            mode: "crossed",
            number: { mode: "box", unit_of_measurement: "lx" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "illuminance" }] },
  },
  "lawn_mower.returned_to_dock": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.errored": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.paused_mowing": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.started_mowing": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.started_returning": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.became_idle": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "light.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "light.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "light.brightness_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", unit_of_measurement: "%" },
              { domain: "sensor", unit_of_measurement: "%" },
            ],
            mode: "changed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "light.brightness_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", unit_of_measurement: "%" },
              { domain: "sensor", unit_of_measurement: "%" },
            ],
            mode: "crossed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "lock.jammed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "lock.locked": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "lock.opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "lock.unlocked": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "media_player.muted": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.unmuted": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.paused_playing": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.started_playing": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.stopped_playing": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.volume_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", unit_of_measurement: "%" },
              { domain: "sensor", unit_of_measurement: "%" },
            ],
            mode: "changed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.volume_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", unit_of_measurement: "%" },
              { domain: "sensor", unit_of_measurement: "%" },
            ],
            mode: "crossed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "moisture.detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "moisture" }] },
  },
  "moisture.cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "moisture" }] },
  },
  "moisture.changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", device_class: "moisture" },
              { domain: "sensor", device_class: "moisture" },
            ],
            mode: "changed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "moisture" }] },
  },
  "moisture.crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", device_class: "moisture" },
              { domain: "sensor", device_class: "moisture" },
            ],
            mode: "crossed",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "moisture" }] },
  },
  "moon.phase_changed": {
    fields: {
      phase: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "phase",
            options: [
              "any",
              "new_moon",
              "waxing_crescent",
              "first_quarter",
              "waxing_gibbous",
              "full_moon",
              "waning_gibbous",
              "last_quarter",
              "waning_crescent",
            ],
          },
        },
      },
    },
  },
  "motion.detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "motion" }] },
  },
  "motion.cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "motion" }] },
  },
  "occupancy.detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "occupancy" }],
    },
  },
  "occupancy.cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "occupancy" }],
    },
  },
  "power.changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: [
                  "mW",
                  "W",
                  "kW",
                  "MW",
                  "GW",
                  "TW",
                  "BTU/h",
                ],
              },
              { domain: "sensor", device_class: "power" },
              { domain: "number", device_class: "power" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["mW", "W", "kW", "MW", "GW", "TW", "BTU/h"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "power" }] },
  },
  "power.crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: [
                  "mW",
                  "W",
                  "kW",
                  "MW",
                  "GW",
                  "TW",
                  "BTU/h",
                ],
              },
              { domain: "sensor", device_class: "power" },
              { domain: "number", device_class: "power" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["mW", "W", "kW", "MW", "GW", "TW", "BTU/h"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "power" }] },
  },
  "remote.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "remote" } },
  },
  "remote.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "remote" } },
  },
  "scene.activated": { fields: {}, target: { entity: { domain: "scene" } } },
  "schedule.block_ended": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "schedule" } },
  },
  "schedule.block_started": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "schedule" } },
  },
  "select.selection_changed": {
    fields: {},
    target: { entity: [{ domain: "select" }, { domain: "input_select" }] },
  },
  "siren.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "siren" } },
  },
  "siren.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "siren" } },
  },
  "sun.sunrise": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.sunset": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.solar_noon": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.solar_midnight": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.dawn": {
    fields: {
      type: {
        required: true,
        default: "civil",
        selector: {
          select: {
            translation_key: "twilight_type",
            options: ["civil", "nautical", "astronomical"],
          },
        },
      },
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.dusk": {
    fields: {
      type: {
        required: true,
        default: "civil",
        selector: {
          select: {
            translation_key: "twilight_type",
            options: ["civil", "nautical", "astronomical"],
          },
        },
      },
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.golden_hour_started": {
    fields: {
      period: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "period",
            options: ["any", "morning", "evening"],
          },
        },
      },
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.golden_hour_ended": {
    fields: {
      period: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "period",
            options: ["any", "morning", "evening"],
          },
        },
      },
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.blue_hour_started": {
    fields: {
      period: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "period",
            options: ["any", "morning", "evening"],
          },
        },
      },
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.blue_hour_ended": {
    fields: {
      period: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "period",
            options: ["any", "morning", "evening"],
          },
        },
      },
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.midnight_sun_started": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.midnight_sun_ended": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.polar_night_started": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.polar_night_ended": {
    fields: {
      offset: {
        required: true,
        default: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        selector: { duration: { enable_day: true } },
      },
      offset_type: {
        required: true,
        default: "before",
        selector: {
          select: {
            translation_key: "trigger_offset_type",
            options: ["before", "after"],
          },
        },
      },
    },
  },
  "sun.elevation_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "°" },
              { domain: "number", unit_of_measurement: "°" },
              { domain: "sensor", unit_of_measurement: "°" },
            ],
            mode: "changed",
            number: {
              min: -90,
              max: 90,
              mode: "box",
              unit_of_measurement: "°",
            },
          },
        },
      },
    },
  },
  "sun.elevation_crossed_threshold": {
    fields: {
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "°" },
              { domain: "number", unit_of_measurement: "°" },
              { domain: "sensor", unit_of_measurement: "°" },
            ],
            mode: "crossed",
            number: {
              min: -90,
              max: 90,
              mode: "box",
              unit_of_measurement: "°",
            },
          },
        },
      },
    },
  },
  "switch.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "switch" }, { domain: "input_boolean" }] },
  },
  "switch.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "switch" }, { domain: "input_boolean" }] },
  },
  "temperature.changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "temperature" },
        { domain: "climate" },
        { domain: "water_heater" },
        { domain: "weather" },
      ],
    },
  },
  "temperature.crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "temperature" },
        { domain: "climate" },
        { domain: "water_heater" },
        { domain: "weather" },
      ],
    },
  },
  "text.changed": {
    fields: {},
    target: { entity: { domain: ["text", "input_text"] } },
  },
  "timer.cancelled": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "timer" } },
  },
  "timer.finished": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "timer" } },
  },
  "timer.paused": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "timer" } },
  },
  "timer.restarted": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "timer" } },
  },
  "timer.started": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "timer" } },
  },
  "timer.remaining_time_reached": {
    fields: { remaining: { required: true, selector: { duration: null } } },
    target: { entity: { domain: "timer" } },
  },
  "todo.item_added": { fields: {}, target: { entity: { domain: "todo" } } },
  "todo.item_completed": { fields: {}, target: { entity: { domain: "todo" } } },
  "todo.item_removed": { fields: {}, target: { entity: { domain: "todo" } } },
  "update.became_available": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "update" } },
  },
  "vacuum.returned_to_dock": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.errored": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.paused_cleaning": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.started_cleaning": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.started_returning": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "valve.closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "valve" } },
  },
  "valve.opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "valve" } },
  },
  "vibration.detected": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "vibration" }],
    },
  },
  "vibration.cleared": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "vibration" }],
    },
  },
  "water_heater.operation_mode_changed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      operation_mode: {
        context: { filter_target: "target" },
        required: true,
        selector: {
          state: {
            attribute: "operation_mode",
            hide_states: ["unavailable", "unknown"],
            multiple: true,
          },
        },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.turned_off": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.turned_on": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.target_temperature_changed": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "changed",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.target_temperature_crossed_threshold": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "crossed",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "window.closed": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "window" },
        { domain: "cover", device_class: "window" },
      ],
    },
  },
  "window.opened": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "window" },
        { domain: "cover", device_class: "window" },
      ],
    },
  },
  "zone.entered": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
    target: { entity: { domain: ["person", "device_tracker"] } },
  },
  "zone.left": {
    fields: {
      behavior: {
        required: true,
        default: "each",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
    target: { entity: { domain: ["person", "device_tracker"] } },
  },
  "zone.occupancy_detected": {
    fields: {
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
  },
  "zone.occupancy_cleared": {
    fields: {
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
  },
};

export const conditionDescriptions: ConditionDescriptions = {
  "air_quality.is_gas_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "gas" }] },
  },
  "air_quality.is_gas_cleared": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "gas" }] },
  },
  "air_quality.is_co_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "carbon_monoxide" }],
    },
  },
  "air_quality.is_co_cleared": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "carbon_monoxide" }],
    },
  },
  "air_quality.is_smoke_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "smoke" }] },
  },
  "air_quality.is_smoke_cleared": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "smoke" }] },
  },
  "air_quality.is_co_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "mg/m³", "μg/m³"],
              },
              { domain: "sensor", device_class: "carbon_monoxide" },
              { domain: "number", device_class: "carbon_monoxide" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "mg/m³", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "carbon_monoxide" }] },
  },
  "air_quality.is_ozone_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "μg/m³"],
              },
              { domain: "sensor", device_class: "ozone" },
              { domain: "number", device_class: "ozone" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "ozone" }] },
  },
  "air_quality.is_voc_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["μg/m³", "mg/m³"],
              },
              { domain: "sensor", device_class: "volatile_organic_compounds" },
              { domain: "number", device_class: "volatile_organic_compounds" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["μg/m³", "mg/m³"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "volatile_organic_compounds" },
      ],
    },
  },
  "air_quality.is_voc_ratio_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "ppm"] },
              {
                domain: "sensor",
                device_class: "volatile_organic_compounds_parts",
              },
              {
                domain: "number",
                device_class: "volatile_organic_compounds_parts",
              },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "volatile_organic_compounds_parts" },
      ],
    },
  },
  "air_quality.is_no_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "μg/m³"] },
              { domain: "sensor", device_class: "nitrogen_monoxide" },
              { domain: "number", device_class: "nitrogen_monoxide" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "μg/m³"],
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "nitrogen_monoxide" }],
    },
  },
  "air_quality.is_no2_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: ["ppb", "ppm", "μg/m³"],
              },
              { domain: "sensor", device_class: "nitrogen_dioxide" },
              { domain: "number", device_class: "nitrogen_dioxide" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "ppm", "μg/m³"],
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "nitrogen_dioxide" }],
    },
  },
  "air_quality.is_so2_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["ppb", "μg/m³"] },
              { domain: "sensor", device_class: "sulphur_dioxide" },
              { domain: "number", device_class: "sulphur_dioxide" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["ppb", "μg/m³"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "sulphur_dioxide" }] },
  },
  "air_quality.is_co2_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "ppm" },
              { domain: "sensor", device_class: "carbon_dioxide" },
              { domain: "number", device_class: "carbon_dioxide" },
            ],
            mode: "is",
            number: { mode: "box", unit_of_measurement: "ppm" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "carbon_dioxide" }] },
  },
  "air_quality.is_pm1_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm1" },
              { domain: "number", device_class: "pm1" },
            ],
            mode: "is",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm1" }] },
  },
  "air_quality.is_pm25_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm25" },
              { domain: "number", device_class: "pm25" },
            ],
            mode: "is",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm25" }] },
  },
  "air_quality.is_pm4_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm4" },
              { domain: "number", device_class: "pm4" },
            ],
            mode: "is",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm4" }] },
  },
  "air_quality.is_pm10_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "pm10" },
              { domain: "number", device_class: "pm10" },
            ],
            mode: "is",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "pm10" }] },
  },
  "air_quality.is_n2o_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "μg/m³" },
              { domain: "sensor", device_class: "nitrous_oxide" },
              { domain: "number", device_class: "nitrous_oxide" },
            ],
            mode: "is",
            number: { mode: "box", unit_of_measurement: "μg/m³" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "nitrous_oxide" }] },
  },
  "alarm_control_panel.is_armed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "alarm_control_panel" } },
  },
  "alarm_control_panel.is_armed_away": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [2] },
    },
  },
  "alarm_control_panel.is_armed_home": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [1] },
    },
  },
  "alarm_control_panel.is_armed_night": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [4] },
    },
  },
  "alarm_control_panel.is_armed_vacation": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: { domain: "alarm_control_panel", supported_features: [32] },
    },
  },
  "alarm_control_panel.is_disarmed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "alarm_control_panel" } },
  },
  "alarm_control_panel.is_triggered": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "alarm_control_panel" } },
  },
  "assist_satellite.is_idle": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "assist_satellite.is_listening": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "assist_satellite.is_processing": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "assist_satellite.is_responding": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "assist_satellite" } },
  },
  "battery.is_low": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "battery.is_not_low": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "battery.is_charging": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery_charging" }],
      primary_entities_only: false,
    },
  },
  "battery.is_not_charging": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "battery_charging" }],
      primary_entities_only: false,
    },
  },
  "battery.is_level": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "battery" },
              { domain: "number", device_class: "battery" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: {
      entity: [{ domain: "sensor", device_class: "battery" }],
      primary_entities_only: false,
    },
  },
  "calendar.is_event_active": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "calendar" }] },
  },
  "climate.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_cooling": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_drying": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_heating": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_hvac_mode": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      hvac_mode: {
        context: { filter_target: "target" },
        required: true,
        selector: {
          state: { hide_states: ["unavailable", "unknown"], multiple: true },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_target_humidity": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "climate.is_target_temperature": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: { entity: { domain: "climate" } },
  },
  "counter.is_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "counter" },
              { domain: "input_number" },
              { domain: "number" },
            ],
            mode: "is",
            number: { mode: "box" },
          },
        },
      },
    },
    target: { entity: [{ domain: "counter" }] },
  },
  "cover.awning_is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "awning" }] },
  },
  "cover.awning_is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "awning" }] },
  },
  "cover.blind_is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "blind" }] },
  },
  "cover.blind_is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "blind" }] },
  },
  "cover.curtain_is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "curtain" }] },
  },
  "cover.curtain_is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "curtain" }] },
  },
  "cover.shade_is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shade" }] },
  },
  "cover.shade_is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shade" }] },
  },
  "cover.shutter_is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shutter" }] },
  },
  "cover.shutter_is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "shutter" }] },
  },
  "door.is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "door" },
        { domain: "cover", device_class: "door" },
      ],
    },
  },
  "door.is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "door" },
        { domain: "cover", device_class: "door" },
      ],
    },
  },
  "fan.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "fan" } },
  },
  "fan.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "fan" } },
  },
  "garage_door.is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "garage_door" },
        { domain: "cover", device_class: "garage" },
      ],
    },
  },
  "garage_door.is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "garage_door" },
        { domain: "cover", device_class: "garage" },
      ],
    },
  },
  "gate.is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "gate" }] },
  },
  "gate.is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "cover", device_class: "gate" }] },
  },
  "humidifier.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.is_drying": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.is_humidifying": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.is_mode": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      mode: {
        context: { filter_target: "target" },
        required: true,
        selector: { state: { attribute: "available_modes", multiple: true } },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidifier.is_target_humidity": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "humidifier" } },
  },
  "humidity.is_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "humidity" },
              { domain: "number", device_class: "humidity" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "humidity" },
        { domain: "climate" },
        { domain: "humidifier" },
        { domain: "weather" },
      ],
    },
  },
  "illuminance.is_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "light" }] },
  },
  "illuminance.is_not_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "light" }] },
  },
  "illuminance.is_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "lx" },
              { domain: "sensor", device_class: "illuminance" },
              { domain: "number", device_class: "illuminance" },
            ],
            mode: "is",
            number: { min: 0, mode: "box", unit_of_measurement: "lx" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "illuminance" }] },
  },
  "lawn_mower.is_docked": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.is_encountering_an_error": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.is_idle": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.is_mowing": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.is_paused": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "lawn_mower.is_returning": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lawn_mower" } },
  },
  "light.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "light.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "light.is_brightness": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", unit_of_measurement: "%" },
              { domain: "sensor", unit_of_measurement: "%" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "light" } },
  },
  "lock.is_jammed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "lock.is_locked": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "lock.is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "lock.is_unlocked": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "lock" } },
  },
  "media_player.is_muted": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_not_playing": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_paused": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_playing": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_unmuted": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "media_player.is_volume": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "number", unit_of_measurement: "%" },
              { domain: "sensor", unit_of_measurement: "%" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: { domain: "media_player" } },
  },
  "moisture.is_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "moisture" }] },
  },
  "moisture.is_not_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "moisture" }] },
  },
  "moisture.is_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "%" },
              { domain: "sensor", device_class: "moisture" },
              { domain: "number", device_class: "moisture" },
            ],
            mode: "is",
            number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" },
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "moisture" }] },
  },
  "moon.is_phase": {
    fields: {
      phase: {
        required: true,
        selector: {
          select: {
            translation_key: "phase",
            options: [
              "new_moon",
              "waxing_crescent",
              "first_quarter",
              "waxing_gibbous",
              "full_moon",
              "waning_gibbous",
              "last_quarter",
              "waning_crescent",
            ],
          },
        },
      },
    },
  },
  "moon.is_waxing": { fields: {} },
  "moon.is_waning": { fields: {} },
  "motion.is_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "motion" }] },
  },
  "motion.is_not_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "binary_sensor", device_class: "motion" }] },
  },
  "occupancy.is_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "occupancy" }],
    },
  },
  "occupancy.is_not_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "occupancy" }],
    },
  },
  "power.is_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              {
                domain: "input_number",
                unit_of_measurement: [
                  "mW",
                  "W",
                  "kW",
                  "MW",
                  "GW",
                  "TW",
                  "BTU/h",
                ],
              },
              { domain: "sensor", device_class: "power" },
              { domain: "number", device_class: "power" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["mW", "W", "kW", "MW", "GW", "TW", "BTU/h"],
          },
        },
      },
    },
    target: { entity: [{ domain: "sensor", device_class: "power" }] },
  },
  "remote.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "remote" } },
  },
  "remote.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "remote" } },
  },
  "schedule.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "schedule" } },
  },
  "schedule.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "schedule" } },
  },
  "select.is_option_selected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      option: {
        context: { filter_target: "target" },
        required: true,
        selector: {
          state: { hide_states: ["unavailable", "unknown"], multiple: true },
        },
      },
    },
    target: { entity: [{ domain: "select" }, { domain: "input_select" }] },
  },
  "siren.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "siren" } },
  },
  "siren.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "siren" } },
  },
  "sun.is_up": { fields: {} },
  "sun.is_set": { fields: {} },
  "sun.is_ascending": { fields: {} },
  "sun.is_descending": { fields: {} },
  "sun.is_night": { fields: {} },
  "sun.is_golden_hour": {
    fields: {
      period: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "period",
            options: ["any", "morning", "evening"],
          },
        },
      },
    },
  },
  "sun.is_blue_hour": {
    fields: {
      period: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "period",
            options: ["any", "morning", "evening"],
          },
        },
      },
    },
  },
  "sun.is_midnight_sun": { fields: {} },
  "sun.is_polar_night": { fields: {} },
  "sun.elevation": {
    fields: {
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: "°" },
              { domain: "number", unit_of_measurement: "°" },
              { domain: "sensor", unit_of_measurement: "°" },
            ],
            mode: "is",
            number: {
              min: -90,
              max: 90,
              mode: "box",
              unit_of_measurement: "°",
            },
          },
        },
      },
    },
  },
  "sun.is_morning_twilight": {
    fields: {
      type: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "twilight_type",
            options: ["any", "civil", "nautical", "astronomical"],
          },
        },
      },
    },
  },
  "sun.is_evening_twilight": {
    fields: {
      type: {
        required: true,
        default: "any",
        selector: {
          select: {
            translation_key: "twilight_type",
            options: ["any", "civil", "nautical", "astronomical"],
          },
        },
      },
    },
  },
  "switch.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "switch" }, { domain: "input_boolean" }] },
  },
  "switch.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "switch" }, { domain: "input_boolean" }] },
  },
  "temperature.is_value": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: {
      entity: [
        { domain: "sensor", device_class: "temperature" },
        { domain: "climate" },
        { domain: "water_heater" },
        { domain: "weather" },
      ],
    },
  },
  "text.is_equal_to": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      value: { required: true, selector: { text: null } },
    },
    target: { entity: [{ domain: "text" }, { domain: "input_text" }] },
  },
  "timer.is_active": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "timer" }] },
  },
  "timer.is_paused": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "timer" }] },
  },
  "timer.is_idle": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "timer" }] },
  },
  "todo.all_completed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "todo" } },
  },
  "todo.incomplete": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number" },
              { domain: "number" },
              { domain: "sensor" },
            ],
            mode: "is",
            number: { min: 0, mode: "box" },
          },
        },
      },
    },
    target: { entity: { domain: "todo" } },
  },
  "update.is_available": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "update" } },
  },
  "update.is_not_available": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "update" } },
  },
  "vacuum.is_cleaning": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.is_docked": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.is_encountering_an_error": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.is_paused": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "vacuum.is_returning": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "vacuum" } },
  },
  "valve.is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "valve" }] },
  },
  "valve.is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: [{ domain: "valve" }] },
  },
  "vibration.is_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "vibration" }],
    },
  },
  "vibration.is_not_detected": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [{ domain: "binary_sensor", device_class: "vibration" }],
    },
  },
  "water_heater.is_off": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.is_on": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.is_operation_mode": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      operation_mode: {
        context: { filter_target: "target" },
        required: true,
        selector: {
          state: {
            attribute: "operation_mode",
            hide_states: ["unavailable", "unknown"],
            multiple: true,
          },
        },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "water_heater.is_target_temperature": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      threshold: {
        required: true,
        selector: {
          numeric_threshold: {
            entity: [
              { domain: "input_number", unit_of_measurement: ["°C", "°F"] },
              { domain: "sensor", device_class: "temperature" },
              { domain: "number", device_class: "temperature" },
            ],
            mode: "is",
            number: { mode: "box" },
            unit_of_measurement: ["°C", "°F"],
          },
        },
      },
    },
    target: { entity: { domain: "water_heater" } },
  },
  "window.is_closed": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "window" },
        { domain: "cover", device_class: "window" },
      ],
    },
  },
  "window.is_open": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
    },
    target: {
      entity: [
        { domain: "binary_sensor", device_class: "window" },
        { domain: "cover", device_class: "window" },
      ],
    },
  },
  "zone.in_zone": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
    target: { entity: { domain: ["person", "device_tracker"] } },
  },
  "zone.not_in_zone": {
    fields: {
      behavior: {
        required: true,
        default: "any",
        selector: { automation_behavior: { mode: "condition" } },
      },
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
    target: { entity: { domain: ["person", "device_tracker"] } },
  },
  "zone.occupancy_is_detected": {
    fields: {
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
  },
  "zone.occupancy_is_not_detected": {
    fields: {
      for: {
        required: true,
        default: "00:00:00",
        selector: { duration: null },
      },
      zone: { required: true, selector: { entity: { domain: "zone" } } },
    },
  },
};

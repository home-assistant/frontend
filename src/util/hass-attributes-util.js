const hassAttributeUtil = {};

hassAttributeUtil.DOMAIN_DEVICE_CLASS = {
  binary_sensor: [
    "battery",
    "cold",
    "connectivity",
    "door",
    "garage_door",
    "gas",
    "heat",
    "light",
    "lock",
    "moisture",
    "motion",
    "moving",
    "occupancy",
    "opening",
    "plug",
    "power",
    "presence",
    "problem",
    "safety",
    "smoke",
    "sound",
    "vibration",
    "window",
  ],
  cover: [
    "awning",
    "blind",
    "curtain",
    "damper",
    "door",
    "garage",
    "shade",
    "shutter",
    "window",
  ],
  sensor: [
    "battery",
    "humidity",
    "illuminance",
    "temperature",
    "pressure",
    "power",
    "signal_strength",
    "timestamp",
  ],
  switch: ["switch", "outlet"],
};

hassAttributeUtil.UNKNOWN_TYPE = "json";
hassAttributeUtil.ADD_TYPE = "key-value";

hassAttributeUtil.TYPE_TO_TAG = {
  string: "ha-customize-string",
  json: "ha-customize-string",
  icon: "ha-customize-icon",
  boolean: "ha-customize-boolean",
  array: "ha-customize-array",
  "key-value": "ha-customize-key-value",
};

// Attributes here serve dual purpose:
// 1) Any key of this object won't be shown in more-info window.
// 2) Any key which has value other than undefined will appear in customization
//    config according to its value.
hassAttributeUtil.LOGIC_STATE_ATTRIBUTES = hassAttributeUtil.LOGIC_STATE_ATTRIBUTES || {
  entity_picture: undefined,
  friendly_name: { type: "string", description: "Name" },
  icon: { type: "icon" },
  emulated_hue: {
    type: "boolean",
    domains: ["emulated_hue"],
  },
  emulated_hue_name: {
    type: "string",
    domains: ["emulated_hue"],
  },
  haaska_hidden: undefined,
  haaska_name: undefined,
  supported_features: undefined,
  attribution: undefined,
  restored: undefined,
  custom_ui_more_info: { type: "string" },
  custom_ui_state_card: { type: "string" },
  device_class: {
    type: "array",
    options: hassAttributeUtil.DOMAIN_DEVICE_CLASS,
    description: "Device class",
    domains: ["binary_sensor", "cover", "sensor", "switch"],
  },
  hidden: { type: "boolean", description: "Hide from UI" },
  assumed_state: {
    type: "boolean",
    domains: [
      "switch",
      "light",
      "cover",
      "climate",
      "fan",
      "group",
      "water_heater",
    ],
  },
  initial_state: {
    type: "string",
    domains: ["automation"],
  },
  unit_of_measurement: { type: "string" },
};

export default hassAttributeUtil;

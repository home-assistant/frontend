import type { Trigger } from "./automation";

export const TRIGGER_TYPES: Trigger["platform"][] = [
  "calendar",
  "device",
  "event",
  "state",
  "geo_location",
  "homeassistant",
  "mqtt",
  "numeric_state",
  "sun",
  "tag",
  "template",
  "time",
  "time_pattern",
  "webhook",
  "zone",
];

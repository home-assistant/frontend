import type { Condition } from "./automation";

export const CONDITION_TYPES: Condition["condition"][] = [
  "device",
  "and",
  "or",
  "not",
  "state",
  "numeric_state",
  "sun",
  "template",
  "time",
  "trigger",
  "zone",
];

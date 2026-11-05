import { arrayLiteralIncludes } from "../../../common/array/literal-includes";
import type { Counter } from "../../../data/counter";
import type { InputBoolean } from "../../../data/input_boolean";
import type { InputButton } from "../../../data/input_button";
import type { InputDateTime } from "../../../data/input_datetime";
import type { InputNumber } from "../../../data/input_number";
import type { InputSelect } from "../../../data/input_select";
import type { InputText } from "../../../data/input_text";
import type { Schedule } from "../../../data/schedule";
import type { Timer } from "../../../data/timer";

export const HELPER_DOMAINS = [
  "input_boolean",
  "input_button",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
  "counter",
  "timer",
  "schedule",
] as const;

export type HelperDomain = (typeof HELPER_DOMAINS)[number];
export const isHelperDomain = arrayLiteralIncludes(HELPER_DOMAINS);

export type Helper =
  | InputBoolean
  | InputButton
  | InputText
  | InputNumber
  | InputSelect
  | InputDateTime
  | Counter
  | Timer
  | Schedule;

type HelperWithoutId<T> = T extends { id: string } ? Omit<T, "id"> : never;

export type HelperFormItem = HelperWithoutId<Helper>;

export const HELPER_CATEGORIES = [
  "input",
  "time",
  "calculation",
  "combine",
  "other",
] as const;

export type HelperCategory = (typeof HELPER_CATEGORIES)[number];

// Helper integrations have no category in their manifest, so the known ones
// are grouped here. Any other helper falls into "other".
const HELPER_DOMAIN_CATEGORIES: Record<string, HelperCategory> = {
  input_boolean: "input",
  input_button: "input",
  input_datetime: "input",
  input_number: "input",
  input_select: "input",
  input_text: "input",
  counter: "input",
  schedule: "time",
  timer: "time",
  tod: "time",
  history_stats: "time",
  derivative: "calculation",
  filter: "calculation",
  integration: "calculation",
  min_max: "calculation",
  mold_indicator: "calculation",
  random: "calculation",
  statistics: "calculation",
  threshold: "calculation",
  trend: "calculation",
  utility_meter: "calculation",
  generic_hygrostat: "combine",
  generic_thermostat: "combine",
  group: "combine",
  switch_as_x: "combine",
  template: "combine",
};

export const getHelperCategory = (domain: string): HelperCategory =>
  HELPER_DOMAIN_CATEGORIES[domain] ?? "other";

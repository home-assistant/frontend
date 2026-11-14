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

/** A helper form, as rendered by the dialogs that save helpers. */
export interface HelperFormElement extends HTMLElement {
  /**
   * Adds edits that are not part of the form's value yet, like a schedule
   * time block that was not applied, firing `value-changed` before saving.
   */
  applyPendingChanges?(): void;
}

export const HELPER_CATEGORIES = [
  "input",
  "time",
  "calculation",
  "other",
] as const;

export type HelperCategory = (typeof HELPER_CATEGORIES)[number];

// Helper integrations have no category or short description in their
// manifest, so the ones shipped with Home Assistant are listed here. Any other
// helper falls into "other" and has no description.
const HELPER_DOMAIN_CATEGORIES = {
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
  template: "calculation",
  utility_meter: "calculation",
  generic_hygrostat: "other",
  generic_thermostat: "other",
  group: "other",
  otp: "other",
  switch_as_x: "other",
} as const satisfies Record<string, HelperCategory>;

export type KnownHelperDomain = keyof typeof HELPER_DOMAIN_CATEGORIES;

export const isKnownHelperDomain = (
  domain: string
): domain is KnownHelperDomain => domain in HELPER_DOMAIN_CATEGORIES;

export const getHelperCategory = (domain: string): HelperCategory =>
  isKnownHelperDomain(domain) ? HELPER_DOMAIN_CATEGORIES[domain] : "other";

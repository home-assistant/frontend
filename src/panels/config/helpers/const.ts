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

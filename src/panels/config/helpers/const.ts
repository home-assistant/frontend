import { Counter } from "../../../data/counter";
import { InputBoolean } from "../../../data/input_boolean";
import { InputButton } from "../../../data/input_button";
import { InputDateTime } from "../../../data/input_datetime";
import { InputNumber } from "../../../data/input_number";
import { InputSelect } from "../../../data/input_select";
import { InputText } from "../../../data/input_text";
import { Timer } from "../../../data/timer";

export const HELPER_DOMAINS = [
  "input_boolean",
  "input_button",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
  "counter",
  "timer",
];

export type Helper =
  | InputBoolean
  | InputButton
  | InputText
  | InputNumber
  | InputSelect
  | InputDateTime
  | Counter
  | Timer;

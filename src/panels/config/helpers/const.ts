import { InputBoolean } from "../../../data/input_boolean";
import { InputDateTime } from "../../../data/input_datetime";
import { InputNumber } from "../../../data/input_number";
import { InputSelect } from "../../../data/input_select";
import { InputText } from "../../../data/input_text";
import { Counter } from "../../../data/counter";

export const HELPER_DOMAINS = [
  "input_boolean",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
  "counter",
];

export type Helper =
  | InputBoolean
  | InputText
  | InputNumber
  | InputSelect
  | InputDateTime
  | Counter;

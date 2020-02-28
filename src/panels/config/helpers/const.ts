import { InputBoolean } from "../../../data/input_boolean";

import { InputText } from "../../../data/input_text";

import { InputNumber } from "../../../data/input_number";

import { InputSelect } from "../../../data/input_select";

import { InputDateTime } from "../../../data/input_datetime";

export const HELPER_DOMAINS = [
  "input_boolean",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
];

export type Helper =
  | InputBoolean
  | InputText
  | InputNumber
  | InputSelect
  | InputDateTime;

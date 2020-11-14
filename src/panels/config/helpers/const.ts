import { Counter } from "../../../data/counter";
import { InputBoolean } from "../../../data/input_boolean";
import { InputDateTime } from "../../../data/input_datetime";
import { InputNumber } from "../../../data/input_number";
import { InputSelect } from "../../../data/input_select";
import { InputText } from "../../../data/input_text";
import { InputTimetable } from "../../../data/input_timetable";
import { Timer } from "../../../data/timer";

export const HELPER_DOMAINS = [
  "input_boolean",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
  "input_timetable",
  "counter",
  "timer",
];

export type Helper =
  | InputBoolean
  | InputText
  | InputNumber
  | InputSelect
  | InputDateTime
  | InputTimetable
  | Counter
  | Timer;

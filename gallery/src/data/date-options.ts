import type { ControlSelectOption } from "../../../src/components/ha-control-select";

export const timeOptions: ControlSelectOption[] = [
  {
    value: "now",
    label: "Now",
  },
  {
    value: "00:15:30",
    label: "12:15:30 AM",
  },
  {
    value: "06:15:30",
    label: "06:15:30 AM",
  },
  {
    value: "12:15:30",
    label: "12:15:30 PM",
  },
  {
    value: "18:15:30",
    label: "06:15:30 PM",
  },
];

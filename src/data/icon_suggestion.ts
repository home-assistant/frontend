import { dump } from "js-yaml";
import type { GenDataTask } from "./ai_task";

export interface IconSuggestionContext {
  type: string;
  [key: string]: unknown;
}

export interface IconSuggestionResult {
  icons?: string[];
}

const REQUESTED_COUNT = 10;

// More are requested than shown, as some suggested icons may not exist
export const SHOWN_SUGGESTION_COUNT = 6;

export const generateIconSuggestionTask = ({
  type,
  ...details
}: IconSuggestionContext): GenDataTask => ({
  task_name: `frontend__${type}__icon`,
  instructions: [
    `Suggest ${REQUESTED_COUNT} icons for the following Home Assistant ${type}, the most fitting first. Use Material Design Icons, written with the mdi: prefix, like mdi:sofa.`,
    "",
    `The ${type} is as follows:`,
    "",
    dump(details),
  ].join("\n"),
  structure: {
    icons: {
      description: "Material Design Icons names, like mdi:sofa",
      required: true,
      selector: { text: { multiple: true } },
    },
  },
});

export const normalizeSuggestedIcon = (icon: string) => {
  const name = icon.trim().toLowerCase();
  return name.includes(":") ? name : `mdi:${name}`;
};

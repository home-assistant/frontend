// Shared preset data for the developer tools Selectors test page.
//
// Each selector type has a default config in SELECTOR_PRESETS. Types that have
// multiple meaningful configurations worth side-by-side testing expose named
// variants via SELECTOR_VARIANTS; these populate the "Preset" picker in the
// UI. Types without an entry there fall back to a single "Default" variant
// built from SELECTOR_PRESETS.
//
// Per-type variant lists live in sibling files (e.g. ./select.ts) and are
// aggregated into SELECTOR_VARIANTS below.

import { SELECT_DEFAULT_CONFIG, SELECT_VARIANTS } from "./select";

export type SelectorKey =
  | "action"
  | "addon"
  | "app"
  | "area"
  | "areas_display"
  | "assist_pipeline"
  | "attribute"
  | "backup_location"
  | "boolean"
  | "button_toggle"
  | "choose"
  | "color_rgb"
  | "color_temp"
  | "condition"
  | "config_entry"
  | "constant"
  | "conversation_agent"
  | "country"
  | "date"
  | "datetime"
  | "device"
  | "duration"
  | "entity"
  | "entity_name"
  | "file"
  | "floor"
  | "icon"
  | "label"
  | "language"
  | "location"
  | "media"
  | "navigation"
  | "number"
  | "numeric_threshold"
  | "object"
  | "period"
  | "qr_code"
  | "select"
  | "selector"
  | "serial_port"
  | "state"
  | "statistic"
  | "stt"
  | "target"
  | "template"
  | "text"
  | "theme"
  | "time"
  | "timezone"
  | "trigger"
  | "tts"
  | "tts_voice"
  | "ui_action"
  | "ui_color"
  | "ui_state_content";

export interface SelectorVariant {
  id: string;
  name: string;
  config: Record<string, unknown>;
}

export const SELECTOR_PRESETS: Record<SelectorKey, Record<string, unknown>> = {
  action: {},
  addon: {},
  app: {},
  area: {},
  areas_display: {},
  assist_pipeline: {},
  attribute: { entity_id: "" },
  backup_location: {},
  boolean: {},
  button_toggle: {
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
  choose: {
    choices: {
      number: { selector: { number: { min: 0, max: 100 } } },
      text: { selector: { text: {} } },
    },
  },
  color_rgb: {},
  color_temp: {},
  condition: {},
  config_entry: {},
  constant: { value: true, label: "Enabled" },
  conversation_agent: {},
  country: {},
  date: {},
  datetime: {},
  device: {},
  duration: {},
  entity: {},
  entity_name: {},
  file: { accept: "*" },
  floor: {},
  icon: {},
  label: {},
  language: {},
  location: {},
  media: {},
  navigation: {},
  number: { min: 0, max: 100, mode: "slider", step: 1 },
  numeric_threshold: {},
  object: {},
  period: {},
  qr_code: { data: "https://www.home-assistant.io" },
  select: SELECT_DEFAULT_CONFIG,
  selector: {},
  serial_port: {},
  state: { entity_id: "" },
  statistic: {},
  stt: {},
  target: {},
  template: {},
  text: {},
  theme: {},
  time: {},
  timezone: {},
  trigger: {},
  tts: {},
  tts_voice: {},
  ui_action: {},
  ui_color: {},
  ui_state_content: {},
};

export const SELECTOR_TYPES = (
  Object.keys(SELECTOR_PRESETS) as SelectorKey[]
).sort();

export const SELECTOR_VARIANTS: Partial<
  Record<SelectorKey, SelectorVariant[]>
> = {
  select: SELECT_VARIANTS,
};

export const getVariants = (type: SelectorKey): SelectorVariant[] => {
  const variants = SELECTOR_VARIANTS[type];
  if (variants && variants.length) {
    return variants;
  }
  return [
    {
      id: "default",
      name: "Default",
      config: SELECTOR_PRESETS[type] ?? {},
    },
  ];
};

export const getInitialConfig = (
  type: SelectorKey
): Record<string, unknown> => ({
  ...(getVariants(type)[0]?.config ?? {}),
});

const ACRONYMS = new Set(["qr", "rgb", "stt", "tts", "ui"]);

export const formatSelectorName = (type: string): string =>
  type
    .split("_")
    .map((word) =>
      ACRONYMS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");

export const SELECTOR_OPTIONS = SELECTOR_TYPES.map((type) => ({
  value: type,
  label: formatSelectorName(type),
}));

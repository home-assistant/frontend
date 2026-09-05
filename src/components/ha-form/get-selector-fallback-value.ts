import { DEFAULT_MIN_KELVIN } from "../../common/color/convert-light-color";
import type {
  Selector,
  SelectorForType,
  SelectorType,
} from "../../data/selector";

type SelectorFallbackValues = {
  [T in SelectorType]: ((selector: SelectorForType<T>) => unknown) | undefined;
};

const SELECTOR_FALLBACK_VALUES = {
  action: undefined,
  addon: undefined,
  automation_behavior: undefined,
  app: undefined,
  area: undefined,
  areas_display: undefined,
  attribute: undefined,
  assist_pipeline: undefined,
  boolean: () => false,
  choose: undefined,
  color_rgb: undefined,
  condition: undefined,
  config_entry: undefined,
  conversation_agent: undefined,
  constant: (selector) => selector.constant?.value,
  country: undefined,
  date: undefined,
  datetime: undefined,
  device: undefined,
  device_class: undefined,
  duration: undefined,
  entity: undefined,
  entity_name: undefined,
  statistic: undefined,
  file: undefined,
  floor: undefined,
  label: undefined,
  language: undefined,
  navigation: undefined,
  number: (selector) => selector.number?.min ?? 0,
  numeric_threshold: undefined,
  object: undefined,
  period: undefined,
  qr_code: undefined,
  select: undefined,
  selector: undefined,
  serial_port: undefined,
  state: undefined,
  state_class: undefined,
  backup_location: undefined,
  stt: undefined,
  target: undefined,
  template: undefined,
  text: undefined,
  time: undefined,
  icon: undefined,
  infrared_command: undefined,
  media: undefined,
  theme: undefined,
  timezone: undefined,
  button_toggle: undefined,
  trigger: undefined,
  tts: undefined,
  tts_voice: undefined,
  location: undefined,
  color_temp: (selector) => {
    if (selector.color_temp?.unit === "kelvin") {
      return selector.color_temp.min ?? DEFAULT_MIN_KELVIN;
    }

    return selector.color_temp?.min ?? selector.color_temp?.min_mireds ?? 153;
  },
  ui_action: undefined,
  ui_clock_date_format: undefined,
  ui_color: undefined,
  ui_state_content: undefined,
  ui_time_format: undefined,
} satisfies SelectorFallbackValues;

/**
 * Value a selector already displays when no field value is set.
 * Used when enabling an optional service/trigger/condition field.
 */
export const getSelectorFallbackValue = (selector: Selector): unknown => {
  const type = Object.keys(selector)[0] as SelectorType;
  const fallbackValue = SELECTOR_FALLBACK_VALUES[type];

  return fallbackValue?.(selector as never);
};

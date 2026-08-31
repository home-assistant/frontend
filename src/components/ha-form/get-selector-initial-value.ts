import { DEFAULT_MIN_KELVIN } from "../../common/color/convert-light-color";
import type {
  Selector,
  SelectorForType,
  SelectorType,
} from "../../data/selector";

type SelectorInitialValues = {
  [T in SelectorType]: ((selector: SelectorForType<T>) => unknown) | undefined;
};

const SELECTOR_INITIAL_VALUES = {
  action: () => [],
  addon: () => "",
  automation_behavior: undefined,
  app: undefined,
  area: (selector) => (selector.area?.multiple ? [] : ""),
  areas_display: undefined,
  attribute: () => "",
  assist_pipeline: undefined,
  boolean: () => false,
  choose: (selector) => {
    const firstChoice = Object.keys(selector.choose.choices)[0];

    if (!firstChoice) {
      return {};
    }

    const childValue = getSelectorInitialValueOrUndefined(
      selector.choose.choices[firstChoice].selector
    );

    return childValue === undefined
      ? { active_choice: firstChoice }
      : { active_choice: firstChoice, [firstChoice]: childValue };
  },
  color_rgb: () => [0, 0, 0],
  condition: () => [],
  config_entry: undefined,
  conversation_agent: undefined,
  constant: (selector) => selector.constant?.value,
  country: (selector) => selector.country?.countries?.[0],
  date: () => new Date().toISOString().slice(0, 10),
  datetime: () => `${new Date().toISOString().slice(0, 10)} 00:00:00`,
  device: (selector) => (selector.device?.multiple ? [] : ""),
  device_class: (selector) =>
    selector.device_class?.multiple ? [] : undefined,
  duration: () => ({
    hours: 0,
    minutes: 0,
    seconds: 0,
  }),
  entity: (selector) => (selector.entity?.multiple ? [] : ""),
  entity_name: undefined,
  statistic: undefined,
  file: () => "",
  floor: undefined,
  label: (selector) => (selector.label?.multiple ? [] : ""),
  language: (selector) => selector.language?.languages?.[0],
  navigation: undefined,
  number: (selector) => selector.number?.min ?? 0,
  numeric_threshold: (selector) => {
    const mode = selector.numeric_threshold?.mode ?? "crossed";
    const type = mode === "changed" ? "any" : "above";

    return type === "any"
      ? { type }
      : {
          type,
          value: {
            number: selector.numeric_threshold?.number?.min ?? 0,
            active_choice: "number",
          },
        };
  },
  object: (selector) => (selector.object?.multiple ? [] : ""),
  period: undefined,
  qr_code: undefined,
  select: (selector) => {
    const select = selector.select;

    if (!select?.options.length) {
      return undefined;
    }

    const firstOption = select.options[0];
    const value =
      typeof firstOption === "string" ? firstOption : firstOption.value;

    return select.multiple ? [value] : value;
  },
  selector: undefined,
  serial_port: () => "",
  state: (selector) => (selector.state?.multiple ? [] : ""),
  backup_location: undefined,
  stt: undefined,
  target: () => ({}),
  template: () => "",
  text: (selector) => (selector.text?.multiple ? [] : ""),
  time: () => "00:00:00",
  icon: () => "",
  media: (selector) => (selector.media?.multiple ? [] : {}),
  theme: () => "",
  timezone: undefined,
  button_toggle: undefined,
  trigger: () => [],
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
} satisfies SelectorInitialValues;

export const getSelectorInitialValueOrUndefined = (
  selector: Selector
): unknown => {
  const type = Object.keys(selector)[0] as SelectorType;
  return SELECTOR_INITIAL_VALUES[type]?.(selector as never);
};

export const getSelectorInitialValue = (selector: Selector): unknown => {
  const type = Object.keys(selector)[0] as SelectorType;
  const initialValue = SELECTOR_INITIAL_VALUES[type];

  if (!initialValue) {
    throw new Error(`Selector ${type} not supported in initial form data`);
  }

  return initialValue(selector as never);
};

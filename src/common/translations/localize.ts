import IntlMessageFormat from "intl-messageformat";
import type { HTMLTemplateResult } from "lit";
import { polyfillLocaleData } from "../../resources/locale-data-polyfill";
import { Resources, TranslationDict } from "../../types";

// Exclude some patterns from key type checking for now
// These are intended to be removed as errors are fixed
// Fixing component category will require tighter definition of types from backend and/or web socket
export type LocalizeKeys =
  | FlattenObjectKeys<Omit<TranslationDict, "supervisor">>
  | `panel.${string}`
  | `ui.card.alarm_control_panel.${string}`
  | `ui.card.weather.attributes.${string}`
  | `ui.card.weather.cardinal_direction.${string}`
  | `ui.card.lawn_mower.actions.${string}`
  | `ui.components.calendar.event.rrule.${string}`
  | `ui.components.logbook.${string}`
  | `ui.components.selectors.file.${string}`
  | `ui.dialogs.entity_registry.editor.${string}`
  | `ui.dialogs.more_info_control.lawn_mower.${string}`
  | `ui.dialogs.more_info_control.vacuum.${string}`
  | `ui.dialogs.quick-bar.commands.${string}`
  | `ui.dialogs.unhealthy.reason.${string}`
  | `ui.dialogs.unsupported.reason.${string}`
  | `ui.panel.config.${string}.${"caption" | "description"}`
  | `ui.panel.config.dashboard.${string}`
  | `ui.panel.config.zha.${string}`
  | `ui.panel.config.zwave_js.${string}`
  | `ui.panel.lovelace.card.${string}`
  | `ui.panel.lovelace.editor.${string}`
  | `ui.panel.page-authorize.form.${string}`
  | `component.${string}`;

// Tweaked from https://www.raygesualdo.com/posts/flattening-object-keys-with-typescript-types
export type FlattenObjectKeys<
  T extends Record<string, any>,
  Key extends keyof T = keyof T,
> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ? `${Key}.${FlattenObjectKeys<T[Key]>}`
    : `${Key}`
  : never;

export type LocalizeFunc<Keys extends string = LocalizeKeys> = (
  key: Keys,
  values?: Record<string, string | number | HTMLTemplateResult>
) => string;

interface FormatType {
  [format: string]: any;
}
export interface FormatsType {
  number: FormatType;
  date: FormatType;
  time: FormatType;
}

let localizationCache: Record<string, IntlMessageFormat> = {};

export const computeLocalize = async <Keys extends string = LocalizeKeys>(
  language: string,
  resources: Resources,
  formats?: FormatsType
): Promise<LocalizeFunc<Keys>> => {
  await import("../../resources/intl-polyfill").then(() =>
    polyfillLocaleData(language)
  );

  // Don't keep around strings from the previous language
  localizationCache = {};

  return (key, ..._args) => {
    if (!key || !resources || !language || !resources[language]) {
      return "";
    }

    const translatedValue = resources[language][key];

    if (!translatedValue) {
      return "";
    }

    // Cache the key/value pairs for the same language, so that we don't
    // do extra work if we're just reusing strings across an application.
    let translatedMessage = localizationCache[translatedValue];

    if (!translatedMessage) {
      try {
        translatedMessage = new IntlMessageFormat(
          translatedValue,
          language,
          formats
        );
      } catch (err: any) {
        return "Translation error: " + err.message;
      }
      localizationCache[translatedValue] = translatedMessage;
    }

    let argObject = {};
    // TS says that we will always get the new format, but we might get the old format
    const args = _args as any;
    if (args.length === 1 && typeof args[0] === "object") {
      argObject = args[0];
    } else if (args.length >= 2) {
      // eslint-disable-next-line no-console
      console.warn(
        `hass.localize for the key "${key}" was invoked using the deprecated arguments format. For more info and guidelines on updating usage, please visit https://developers.home-assistant.io/blog/2023/09/27/localize-handling.`
      );
      for (let i = 0; i < args.length; i += 2) {
        argObject[args[i]] = args[i + 1];
      }
    }
    if (Object.values(argObject).some((v) => v == null)) {
      // eslint-disable-next-line no-console
      console.error(
        `hass.localize for the key "${key}" was invoked with an undefined parameter. For more info about what this means, please visit https://developers.home-assistant.io/blog/2023/09/27/localize-handling.`
      );
    }

    try {
      return translatedMessage.format<string>(argObject) as string;
    } catch (err: any) {
      return "Translation " + err;
    }
  };
};

import IntlMessageFormat from "intl-messageformat";
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
  ...args: any[]
) => string;

interface FormatType {
  [format: string]: any;
}
export interface FormatsType {
  number: FormatType;
  date: FormatType;
  time: FormatType;
}

/**
 * Adapted from Polymer app-localize-behavior.
 *
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * Optional dictionary of user defined formats, as explained here:
 * http://formatjs.io/guides/message-syntax/#custom-formats
 *
 * For example, a valid dictionary of formats would be:
 * this.formats = {
 *    number: { USD: { style: 'currency', currency: 'USD' } }
 * }
 */

export const computeLocalize = async <Keys extends string = LocalizeKeys>(
  cache: any,
  language: string,
  resources: Resources,
  formats?: FormatsType
): Promise<LocalizeFunc<Keys>> => {
  await import("../../resources/intl-polyfill").then(() =>
    polyfillLocaleData(language)
  );

  // Every time any of the parameters change, invalidate the strings cache.
  cache._localizationCache = {};

  return (key, ...args) => {
    if (!key || !resources || !language || !resources[language]) {
      return "";
    }

    // Cache the key/value pairs for the same language, so that we don't
    // do extra work if we're just reusing strings across an application.
    const translatedValue = resources[language][key];

    if (!translatedValue) {
      return "";
    }

    const messageKey = key + translatedValue;
    let translatedMessage = cache._localizationCache[messageKey] as
      | IntlMessageFormat
      | undefined;

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
      cache._localizationCache[messageKey] = translatedMessage;
    }

    let argObject = {};
    if (args.length === 1 && typeof args[0] === "object") {
      argObject = args[0];
    } else {
      for (let i = 0; i < args.length; i += 2) {
        argObject[args[i]] = args[i + 1];
      }
    }

    try {
      return translatedMessage.format<string>(argObject) as string;
    } catch (err: any) {
      return "Translation " + err;
    }
  };
};

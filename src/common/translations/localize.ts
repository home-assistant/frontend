import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTime } from "@formatjs/intl-relativetimeformat/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillDateTime } from "@formatjs/intl-datetimeformat/lib/should-polyfill";
import IntlMessageFormat from "intl-messageformat";
import { Resources, TranslationDict } from "../../types";
import { getLocalLanguage } from "../../util/common-translation";

// Exclude some patterns from key type checking for now
// These are intended to be removed as errors are fixed
// Fixing component category will require tighter definition of types from backend and/or web socket
export type LocalizeKeys =
  | FlattenObjectKeys<Omit<TranslationDict, "supervisor">>
  | `panel.${string}`
  | `state.${string}`
  | `state_attributes.${string}`
  | `state_badge.${string}`
  | `ui.card.alarm_control_panel.${string}`
  | `ui.card.weather.attributes.${string}`
  | `ui.card.weather.cardinal_direction.${string}`
  | `ui.components.logbook.${string}`
  | `ui.components.selectors.file.${string}`
  | `ui.dialogs.entity_registry.editor.${string}`
  | `ui.dialogs.more_info_control.vacuum.${string}`
  | `ui.dialogs.options_flow.loading.${string}`
  | `ui.dialogs.quick-bar.commands.${string}`
  | `ui.dialogs.repair_flow.loading.${string}`
  | `ui.dialogs.unhealthy.reason.${string}`
  | `ui.dialogs.unsupported.reason.${string}`
  | `ui.panel.config.${string}.${"caption" | "description"}`
  | `ui.panel.config.automation.${string}`
  | `ui.panel.config.dashboard.${string}`
  | `ui.panel.config.devices.${string}`
  | `ui.panel.config.energy.${string}`
  | `ui.panel.config.helpers.${string}`
  | `ui.panel.config.info.${string}`
  | `ui.panel.config.integrations.${string}`
  | `ui.panel.config.logs.${string}`
  | `ui.panel.config.lovelace.${string}`
  | `ui.panel.config.network.${string}`
  | `ui.panel.config.scene.${string}`
  | `ui.panel.config.url.${string}`
  | `ui.panel.config.zha.${string}`
  | `ui.panel.config.zwave_js.${string}`
  | `ui.panel.developer-tools.tabs.${string}`
  | `ui.panel.lovelace.card.${string}`
  | `ui.panel.lovelace.editor.${string}`
  | `ui.panel.page-authorize.form.${string}`
  | `component.${string}`;

// Tweaked from https://www.raygesualdo.com/posts/flattening-object-keys-with-typescript-types
export type FlattenObjectKeys<
  T extends Record<string, any>,
  Key extends keyof T = keyof T
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

const loadedPolyfillLocale = new Set();

const polyfills: Promise<any>[] = [];
if (__BUILD__ === "latest") {
  if (shouldPolyfillLocale()) {
    polyfills.push(import("@formatjs/intl-locale/polyfill"));
  }
  if (shouldPolyfillPluralRules()) {
    polyfills.push(import("@formatjs/intl-pluralrules/polyfill"));
    polyfills.push(import("@formatjs/intl-pluralrules/locale-data/en"));
  }
  if (shouldPolyfillRelativeTime()) {
    polyfills.push(import("@formatjs/intl-relativetimeformat/polyfill"));
  }
  if (shouldPolyfillDateTime()) {
    polyfills.push(import("@formatjs/intl-datetimeformat/polyfill"));
    polyfills.push(import("@formatjs/intl-datetimeformat/add-all-tz"));
  }
}

export const polyfillsLoaded =
  polyfills.length === 0
    ? undefined
    : Promise.all(polyfills).then(() =>
        // Load the default language
        loadPolyfillLocales(getLocalLanguage())
      );

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
  if (polyfillsLoaded) {
    await polyfillsLoaded;
  }

  await loadPolyfillLocales(language);

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

export const loadPolyfillLocales = async (language: string) => {
  if (loadedPolyfillLocale.has(language)) {
    return;
  }
  loadedPolyfillLocale.add(language);
  try {
    if (
      Intl.NumberFormat &&
      // @ts-ignore
      typeof Intl.NumberFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `/static/locale-data/intl-numberformat/${language}.json`
      );
      // @ts-ignore
      Intl.NumberFormat.__addLocaleData(await result.json());
    }
    if (
      // @ts-expect-error
      Intl.RelativeTimeFormat &&
      // @ts-ignore
      typeof Intl.RelativeTimeFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `/static/locale-data/intl-relativetimeformat/${language}.json`
      );
      // @ts-ignore
      Intl.RelativeTimeFormat.__addLocaleData(await result.json());
    }
    if (
      Intl.DateTimeFormat &&
      // @ts-ignore
      typeof Intl.DateTimeFormat.__addLocaleData === "function"
    ) {
      const result = await fetch(
        `/static/locale-data/intl-datetimeformat/${language}.json`
      );
      // @ts-ignore
      Intl.DateTimeFormat.__addLocaleData(await result.json());
    }
  } catch (_e) {
    // Ignore
  }
};

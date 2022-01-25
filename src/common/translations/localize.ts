import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTime } from "@formatjs/intl-relativetimeformat/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillDateTime } from "@formatjs/intl-datetimeformat/lib/should-polyfill";
import IntlMessageFormat from "intl-messageformat";
import { Resources } from "../../types";
import { getLocalLanguage } from "../../util/common-translation";

export type LocalizeFunc = (key: string, ...args: any[]) => string;
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

export const computeLocalize = async (
  cache: any,
  language: string,
  resources: Resources,
  formats?: FormatsType
): Promise<LocalizeFunc> => {
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

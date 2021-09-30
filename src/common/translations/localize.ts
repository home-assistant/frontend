import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTime } from "@formatjs/intl-relativetimeformat/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillDateTime } from "@formatjs/intl-datetimeformat/lib/should-polyfill";
import IntlMessageFormat from "intl-messageformat";
import { Resources } from "../../types";

export type LocalizeFunc = (key: string, ...args: any[]) => string;
interface FormatType {
  [format: string]: any;
}
export interface FormatsType {
  number: FormatType;
  date: FormatType;
  time: FormatType;
}

let loadedPolyfillLocale: Set<string> | undefined;

const polyfillPluralRules = shouldPolyfillPluralRules();
const polyfillRelativeTime = shouldPolyfillRelativeTime();
const polyfillDateTime = shouldPolyfillDateTime();

const polyfills: Promise<any>[] = [];
if (__BUILD__ === "latest") {
  if (shouldPolyfillLocale()) {
    polyfills.push(import("@formatjs/intl-locale/polyfill"));
  }
  if (polyfillPluralRules) {
    polyfills.push(import("@formatjs/intl-pluralrules/polyfill"));
  }
  if (polyfillRelativeTime) {
    polyfills.push(import("@formatjs/intl-relativetimeformat/polyfill"));
  }
  if (polyfillDateTime) {
    polyfills.push(import("@formatjs/intl-datetimeformat/polyfill"));
  }
}

let polyfillLoaded = polyfills.length === 0;
export const polyfillsLoaded = polyfillLoaded
  ? undefined
  : Promise.all(polyfills).then(() => {
      loadedPolyfillLocale = new Set();
      polyfillLoaded = true;
      // Load English so it becomes the default
      return loadPolyfillLocales("en");
    });

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
  if (!polyfillLoaded) {
    await polyfillsLoaded;
  }

  loadPolyfillLocales(language);

  // Everytime any of the parameters change, invalidate the strings cache.
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
  if (!loadedPolyfillLocale || loadedPolyfillLocale.has(language)) {
    return;
  }
  loadedPolyfillLocale.add(language);
  try {
    if (polyfillPluralRules) {
      await import(`@formatjs/intl-pluralrules/locale-data/${language}`);
    }
    if (polyfillRelativeTime) {
      await import(`@formatjs/intl-relativetimeformat/locale-data/${language}`);
    }
    if (polyfillDateTime) {
      await import(`@formatjs/intl-datetimeformat/locale-data/${language}`);
    }
  } catch (_e) {
    // Ignore
  }
};

import { shouldPolyfill } from "@formatjs/intl-pluralrules/lib/should-polyfill";
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

let polyfillLoaded = !shouldPolyfill();
const polyfillProm = polyfillLoaded
  ? undefined
  : import("@formatjs/intl-locale/polyfill")
      .then(() => import("@formatjs/intl-pluralrules/polyfill"))
      .then(() => {
        loadedPolyfillLocale = new Set();
        polyfillLoaded = true;
      });

type ResourceObject = string | Record<string, string>;

const getResource = (
  translations: ResourceObject,
  path: string
): string | undefined => {
  const keys = path.split(".");
  let curValue: ResourceObject = translations;
  for (const key of keys) {
    curValue = curValue[key];
    if (!curValue) {
      return undefined;
    }
  }
  return curValue as string;
};

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
    await polyfillProm;
  }

  if (loadedPolyfillLocale && !loadedPolyfillLocale.has(language)) {
    try {
      loadedPolyfillLocale.add(language);
      await import("@formatjs/intl-pluralrules/locale-data/en");
    } catch (_e) {
      // Ignore
    }
  }

  // Everytime any of the parameters change, invalidate the strings cache.
  cache._localizationCache = {};

  return (key, ...args) => {
    if (!key || !resources || !language || !resources[language]) {
      return "";
    }

    // Cache the key/value pairs for the same language, so that we don't
    // do extra work if we're just reusing strings across an application.
    const translatedValue = getResource(resources[language], key);

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
      } catch (err) {
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
    } catch (err) {
      return "Translation " + err;
    }
  };
};

import IntlMessageFormat from "intl-messageformat/src/main";
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

export const computeLocalize = (
  cache: any,
  language: string,
  resources: Resources,
  formats?: FormatsType
): LocalizeFunc => {
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
    let translatedMessage = cache._localizationCache[messageKey];

    if (!translatedMessage) {
      translatedMessage = new (IntlMessageFormat as any)(
        translatedValue,
        language,
        formats
      );
      cache._localizationCache[messageKey] = translatedMessage;
    }

    const argObject = {};
    for (let i = 0; i < args.length; i += 2) {
      argObject[args[i]] = args[i + 1];
    }

    try {
      return translatedMessage.format(argObject);
    } catch (err) {
      return "Translation " + err;
    }
  };
};

/**
 * Silly helper function that converts an object of placeholders to array so we
 * can convert it back to an object again inside the localize func.
 * @param localize
 * @param key
 * @param placeholders
 */
export const localizeKey = (
  localize: LocalizeFunc,
  key: string,
  placeholders?: { [key: string]: string }
) => {
  const args: [string, ...string[]] = [key];
  if (placeholders) {
    Object.keys(placeholders).forEach((placeholderKey) => {
      args.push(placeholderKey);
      args.push(placeholders[placeholderKey]);
    });
  }
  return localize(...args);
};

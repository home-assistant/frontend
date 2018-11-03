import IntlMessageFormat from "intl-messageformat/src/main";

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
interface FormatType {
  [format: string]: any;
}
export interface FormatsType {
  number: FormatType;
  date: FormatType;
  time: FormatType;
}

export type LocalizeFunc = (key: string, ...args: any[]) => string;

export interface LocalizeMixin {
  localize: LocalizeFunc;
}

export const localizeBaseMixin = (superClass) =>
  class extends superClass {
    /**
     * Returns a computed `localize` method, based on the current `language`.
     */
    public __computeLocalize(
      language: string,
      resources: string,
      formats?: FormatsType
    ): LocalizeFunc {
      const proto = this.constructor.prototype;

      // Check if localCache exist just in case.
      this.__checkLocalizationCache(proto);

      // Everytime any of the parameters change, invalidate the strings cache.
      if (!proto.__localizationCache) {
        proto.__localizationCache = {
          messages: {},
        };
      }
      proto.__localizationCache.messages = {};

      return (key, ...args) => {
        if (!key || !resources || !language || !resources[language]) {
          return "";
        }

        // Cache the key/value pairs for the same language, so that we don't
        // do extra work if we're just reusing strings across an application.
        const translatedValue = resources[language][key];

        if (!translatedValue) {
          return this.useKeyIfMissing ? key : "";
        }

        const messageKey = key + translatedValue;
        let translatedMessage = proto.__localizationCache.messages[messageKey];

        if (!translatedMessage) {
          translatedMessage = new (IntlMessageFormat as any)(
            translatedValue,
            language,
            formats
          );
          proto.__localizationCache.messages[messageKey] = translatedMessage;
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
    }

    public __checkLocalizationCache(proto) {
      // do nothing if proto is undefined.
      if (proto === undefined) {
        return;
      }

      // In the event proto not have __localizationCache object, create it.
      if (proto.__localizationCache === undefined) {
        proto.__localizationCache = {
          messages: {},
        };
      }
    }
  };

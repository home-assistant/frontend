import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import IntlMessageFormat from "intl-messageformat/src/main.js";

/**
Adapted from Polymer app-localize-behavior.

Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

export const LocalizeBaseMixin = dedupingMixin(
  (superClass) =>
    class extends superClass {
      /**
       * Returns a computed `localize` method, based on the current `language`.
       */
      __computeLocalize(language, resources, formats) {
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
          let translatedMessage =
            proto.__localizationCache.messages[messageKey];

          if (!translatedMessage) {
            translatedMessage = new IntlMessageFormat(
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

          return translatedMessage.format(argObject);
        };
      }

      __checkLocalizationCache(proto) {
        // do nothing if proto is undefined.
        if (proto === undefined) return;

        // In the event proto not have __localizationCache object, create it.
        if (proto.__localizationCache === undefined) {
          proto.__localizationCache = {
            messages: {},
          };
        }
      }
    }
);

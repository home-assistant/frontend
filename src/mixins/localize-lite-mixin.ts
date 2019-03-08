/**
 * Lite mixin to add localization without depending on the Hass object.
 */
import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin";
import { getLocalLanguage } from "../util/hass-translation";
import { localizeLiteBaseMixin } from "./localize-lite-base-mixin";
import { computeLocalize } from "../common/translations/localize";

/**
 * @polymerMixin
 */
export const localizeLiteMixin = dedupingMixin(
  (superClass) =>
    class extends localizeLiteBaseMixin(superClass) {
      static get properties() {
        return {
          language: {
            type: String,
            // Use browser language setup before login.
            value: getLocalLanguage(),
          },
          resources: Object,
          // The fragment to load.
          translationFragment: String,
          /**
           * Translates a string to the current `language`. Any parameters to the
           * string should be passed in order, as follows:
           * `localize(stringKey, param1Name, param1Value, param2Name, param2Value)`
           */
          localize: {
            type: Function,
            computed: "__computeLocalize(language, resources, formats)",
          },
        };
      }

      public ready() {
        super.ready();
        this._initializeLocalizeLite();
      }

      protected __computeLocalize(language, resources, formats?) {
        return computeLocalize(
          this.constructor.prototype,
          language,
          resources,
          formats
        );
      }
    }
);

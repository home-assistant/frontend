/**
 * Lite mixin to add localization without depending on the Hass object.
 */
import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin";
import { localizeBaseMixin } from "./localize-base-mixin";
import { getActiveTranslation, getTranslation } from "../util/hass-translation";

/**
 * @polymerMixin
 */
export default dedupingMixin(
  (superClass) =>
    class extends localizeBaseMixin(superClass) {
      static get properties() {
        return {
          language: {
            type: String,
            value: getActiveTranslation(),
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

      ready() {
        super.ready();

        if (this.resources) {
          return;
        }

        if (!this.translationFragment) {
          // In dev mode, we will issue a warning if after a second we are still
          // not configured correctly.
          if (__DEV__) {
            /* eslint-disable no-console */
            setTimeout(
              () =>
                !this.resources &&
                console.error(
                  "Forgot to pass in resources or set translationFragment for",
                  this.nodeName
                ),
              1000
            );
          }
          return;
        }

        this._updateResources();
      }

      async _updateResources() {
        const { language, data } = await getTranslation(
          this.translationFragment
        );
        this.resources = {
          [language]: data,
        };
      }
    }
);

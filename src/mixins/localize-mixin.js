import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LocalizeBaseMixin } from "./localize-base-mixin.js";
/**
 * Polymer Mixin to enable a localize function powered by language/resources from hass object.
 *
 * @polymerMixin
 */
export default dedupingMixin(
  (superClass) =>
    class extends LocalizeBaseMixin(superClass) {
      static get properties() {
        return {
          hass: Object,

          /**
           * Translates a string to the current `language`. Any parameters to the
           * string should be passed in order, as follows:
           * `localize(stringKey, param1Name, param1Value, param2Name, param2Value)`
           */
          localize: {
            type: Function,
            computed:
              "__computeLocalize(hass.language, hass.resources, formats)",
          },
        };
      }
    }
);

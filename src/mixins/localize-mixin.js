import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import { ElementMixin } from '@polymer/polymer/lib/mixins/element-mixin.js';
import { AppLocalizeBehavior } from '../util/app-localize-behavior.js';

/**
 * @polymerMixin
 * @appliesMixin AppLocalizeBehavior
 */
export default dedupingMixin(superClass =>
  class extends mixinBehaviors([AppLocalizeBehavior], ElementMixin(superClass)) {
    static get properties() {
      return {
        hass: Object,
        language: {
          type: String,
          computed: 'computeLanguage(hass)',
        },
        resources: {
          type: Object,
          computed: 'computeResources(hass)',
        },
      };
    }

    computeLanguage(hass) {
      return hass && hass.language;
    }

    computeResources(hass) {
      return hass && hass.resources;
    }
  });

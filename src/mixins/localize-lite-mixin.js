/**
 * Lite mixin to add localization without depending on the Hass object.
 */
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import { AppLocalizeBehavior } from '../util/app-localize-behavior.js';
import { getActiveTranslation, getTranslation } from '../util/hass-translation.js';

/**
 * @polymerMixin
 * @appliesMixin AppLocalizeBehavior
 */
export default dedupingMixin(superClass =>
  class extends mixinBehaviors([AppLocalizeBehavior], superClass) {
    static get properties() {
      return {
        language: {
          type: String,
          value: getActiveTranslation(),
        },
        resources: Object,
        // The fragment to load.
        translationFragment: String,
      };
    }

    async ready() {
      super.ready();

      if (this.resources) {
        return;
      }

      if (!this.translationFragment) {
      // In dev mode, we will issue a warning if after a second we are still
      // not configured correctly.
        if (__DEV__) {
        // eslint-disable-next-line
          setTimeout(() => !this.resources && console.error(
            'Forgot to pass in resources or set translationFragment for',
            this.nodeName
          ), 1000);
        }
        return;
      }

      const { language, data } = await getTranslation(this.translationFragment);
      this.resources = {
        [language]: data
      };
    }
  });

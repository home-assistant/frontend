import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import { PaperDialogBehavior } from '@polymer/paper-dialog-behavior/paper-dialog-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import EventsMixin from './events-mixin';
/**
 * @polymerMixin
 * @appliesMixin window.hassMixins.EventsMixin
 * @appliesMixin PaperDialogBehavior
 */
export default dedupingMixin(superClass =>
  class extends mixinBehaviors([PaperDialogBehavior], EventsMixin(superClass)) {
    static get properties() {
      return {
        withBackdrop: {
          type: Boolean,
          value: true,
        },
      };
    }
  });

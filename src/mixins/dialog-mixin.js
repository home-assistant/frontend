import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin";
import { PaperDialogBehavior } from "@polymer/paper-dialog-behavior/paper-dialog-behavior";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";
import { EventsMixin } from "./events-mixin";
/**
 * @polymerMixin
 * @appliesMixin EventsMixin
 * @appliesMixin PaperDialogBehavior
 */
export default dedupingMixin(
  (superClass) =>
    class extends mixinBehaviors(
      [EventsMixin, PaperDialogBehavior],
      superClass
    ) {
      static get properties() {
        return {
          withBackdrop: {
            type: Boolean,
            value: true,
          },
        };
      }
    }
);

import "@polymer/paper-dialog/paper-dialog";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";
import { HaIronFocusablesHelper } from "./ha-iron-focusables-helper.js";

const paperDialogClass = customElements.get("paper-dialog");
// as Constructor<PaperIconButtonElement>;

const haTabFixBehaviorImpl = {
  get _focusableNodes() {
    return HaIronFocusablesHelper.getTabbableNodes(this);
  },
};

// define a class that uses the haTabFixBehaviorImpl behvaior to override the method which fails
export class HaPaperDialog extends mixinBehaviors(
  [haTabFixBehaviorImpl],
  paperDialogClass
) {}

customElements.define("ha-paper-dialog", HaPaperDialog);

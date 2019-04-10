import "@polymer/paper-dialog/paper-dialog";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";
import { HaIronFocusablesHelper } from "./ha-iron-focusables-helper.js";
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";

const paperDialogClass = customElements.get("paper-dialog");

// behavior that will override existing iron-overlay-behavior and call the fixed implementation
const haTabFixBehaviorImpl = {
  get _focusableNodes() {
    return HaIronFocusablesHelper.getTabbableNodes(this);
  },
};

// paper-dialog that uses the haTabFixBehaviorImpl behvaior
// export class HaPaperDialog extends paperDialogClass {}
// @ts-ignore
export class HaPaperDialog
  extends mixinBehaviors([haTabFixBehaviorImpl], paperDialogClass)
  implements PaperDialogElement {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-paper-dialog": HaPaperDialog;
  }
}
customElements.define("ha-paper-dialog", HaPaperDialog);

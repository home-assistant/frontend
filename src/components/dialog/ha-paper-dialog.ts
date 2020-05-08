import "@polymer/paper-dialog";
import type { PaperDialogElement } from "@polymer/paper-dialog";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class.js";
import type { Constructor } from "../../types";
import { HaIronFocusablesHelper } from "./ha-iron-focusables-helper";

const paperDialogClass = customElements.get("paper-dialog") as Constructor<
  PaperDialogElement
>;

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
// @ts-ignore
customElements.define("ha-paper-dialog", HaPaperDialog);

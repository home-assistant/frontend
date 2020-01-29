import { customElement, CSSResult, css } from "lit-element";
import "@material/mwc-dialog";
import { style } from "@material/mwc-dialog/mwc-dialog-css";
// tslint:disable-next-line
import { Dialog } from "@material/mwc-dialog";
import { Constructor } from "../types";
// tslint:disable-next-line
const MwcDialog = customElements.get("mwc-dialog") as Constructor<Dialog>;

@customElement("ha-dialog")
export class HaDialog extends MwcDialog {
  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
        .mdc-dialog__actions {
          justify-content: var(--justify-action-buttons, flex-end);
        }
        .mdc-dialog__container {
          align-items: var(--vertial-align-dialog, center);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog": HaDialog;
  }
}

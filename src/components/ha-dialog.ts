import { customElement, CSSResult, css, html } from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@material/mwc-dialog";
import { style } from "@material/mwc-dialog/mwc-dialog-css";
// tslint:disable-next-line
import { Dialog } from "@material/mwc-dialog";
import { Constructor, HomeAssistant } from "../types";
// tslint:disable-next-line
const MwcDialog = customElements.get("mwc-dialog") as Constructor<Dialog>;

export const createCloseHeading = (hass: HomeAssistant, title: string) => html`
  ${title}
  <paper-icon-button
    aria-label=${hass.localize("ui.dialogs.generic.close")}
    icon="hass:close"
    dialogAction="close"
    class="close_button"
  ></paper-icon-button>
`;

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
        .mdc-dialog__title::before {
          display: block;
          height: 20px;
        }
        .close_button {
          position: absolute;
          right: 16px;
          top: 12px;
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

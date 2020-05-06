import "@material/mwc-dialog";
import type { Dialog } from "@material/mwc-dialog";
import { style } from "@material/mwc-dialog/mwc-dialog-css";
import "./ha-icon-button";
import { css, CSSResult, customElement, html } from "lit-element";
import type { Constructor, HomeAssistant } from "../types";

const MwcDialog = customElements.get("mwc-dialog") as Constructor<Dialog>;

export const createCloseHeading = (hass: HomeAssistant, title: string) => html`
  ${title}
  <ha-icon-button
    aria-label=${hass.localize("ui.dialogs.generic.close")}
    icon="hass:close"
    dialogAction="close"
    class="close_button"
  ></ha-icon-button>
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

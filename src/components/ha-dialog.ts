import "@material/mwc-dialog";
import type { Dialog } from "@material/mwc-dialog";
import { style } from "@material/mwc-dialog/mwc-dialog-css";
import "./ha-icon-button";
import { css, CSSResult, customElement, html } from "lit-element";
import type { Constructor, HomeAssistant } from "../types";
import { mdiClose } from "@mdi/js";
import { computeRTL } from "../common/util/compute_rtl";

const MwcDialog = customElements.get("mwc-dialog") as Constructor<Dialog>;

export const createCloseHeading = (hass: HomeAssistant, title: string) => html`
  ${title}
  <mwc-icon-button
    aria-label=${hass.localize("ui.dialogs.generic.close")}
    dialogAction="close"
    ?rtl=${computeRTL(hass)}
    class="header_button"
  >
    <ha-svg-icon path=${mdiClose}></ha-svg-icon>
  </mwc-icon-button>
`;

@customElement("ha-dialog")
export class HaDialog extends MwcDialog {
  protected renderHeading() {
    return html`<slot name="heading">
      ${super.renderHeading()}
    </slot>`;
  }

  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
        .mdc-dialog {
          z-index: var(--dialog-z-index, 7);
        }
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
        .mdc-dialog .mdc-dialog__content {
          position: var(--dialog-content-position, relative);
          padding: var(--dialog-content-padding, 20px 24px);
        }
        .mdc-dialog .mdc-dialog__surface {
          position: var(--dialog-content-position, relative);
          min-height: var(--mdc-dialog-min-height, auto);
        }
        .header_button {
          position: absolute;
          right: 16px;
          top: 12px;
          text-decoration: none;
          color: inherit;
        }
        mwc-icon-button[rtl].header_button {
          right: auto;
          left: 16px;
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

import { DialogBase } from "@material/mwc-dialog/mwc-dialog-base";
import { styles } from "@material/mwc-dialog/mwc-dialog.css";
import { mdiClose } from "@mdi/js";
import { css, html, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import { computeRTLDirection } from "../common/util/compute_rtl";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";

export const createCloseHeading = (
  hass: HomeAssistant,
  title: string | TemplateResult
) => html`
  <span class="header_title">${title}</span>
  <ha-icon-button
    .label=${hass.localize("ui.dialogs.generic.close")}
    .path=${mdiClose}
    dialogAction="close"
    class="header_button"
    dir=${computeRTLDirection(hass)}
  ></ha-icon-button>
`;

@customElement("ha-dialog")
export class HaDialog extends DialogBase {
  public scrollToPos(x: number, y: number) {
    this.contentElement?.scrollTo(x, y);
  }

  protected renderHeading() {
    return html`<slot name="heading"> ${super.renderHeading()} </slot>`;
  }

  static override styles = [
    styles,
    css`
      .mdc-dialog {
        --mdc-dialog-scroll-divider-color: var(--divider-color);
        z-index: var(--dialog-z-index, 7);
        -webkit-backdrop-filter: var(--dialog-backdrop-filter, none);
        backdrop-filter: var(--dialog-backdrop-filter, none);
      }
      .mdc-dialog__actions {
        justify-content: var(--justify-action-buttons, flex-end);
        padding-bottom: max(env(safe-area-inset-bottom), 8px);
      }
      .mdc-dialog__actions span:nth-child(1) {
        flex: var(--secondary-action-button-flex, unset);
      }
      .mdc-dialog__actions span:nth-child(2) {
        flex: var(--primary-action-button-flex, unset);
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
      :host([hideactions]) .mdc-dialog .mdc-dialog__content {
        padding-bottom: max(
          var(--dialog-content-padding, 20px),
          env(safe-area-inset-bottom)
        );
      }
      .mdc-dialog .mdc-dialog__surface {
        position: var(--dialog-surface-position, relative);
        top: var(--dialog-surface-top);
        min-height: var(--mdc-dialog-min-height, auto);
        border-radius: var(
          --ha-dialog-border-radius,
          var(--ha-card-border-radius, 4px)
        );
      }
      :host([flexContent]) .mdc-dialog .mdc-dialog__content {
        display: flex;
        flex-direction: column;
      }
      .header_button {
        position: absolute;
        right: 16px;
        top: 10px;
        text-decoration: none;
        color: inherit;
      }
      .header_title {
        margin-right: 40px;
      }
      [dir="rtl"].header_button {
        right: auto;
        left: 16px;
      }
      [dir="rtl"].header_title {
        margin-left: 40px;
        margin-right: 0px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog": HaDialog;
  }
}

import { DialogBase } from "@material/mwc-dialog/mwc-dialog-base";
import { styles } from "@material/mwc-dialog/mwc-dialog.css";
import { mdiClose } from "@mdi/js";
import { css, html, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";

const SUPPRESS_DEFAULT_PRESS_SELECTOR = ["button", "ha-list-item"];

export const createCloseHeading = (
  hass: HomeAssistant | undefined,
  title: string | TemplateResult
) => html`
  <div class="header_title">${title}</div>
  <ha-icon-button
    .label=${hass?.localize("ui.dialogs.generic.close") ?? "Close"}
    .path=${mdiClose}
    dialogAction="close"
    class="header_button"
  ></ha-icon-button>
`;

@customElement("ha-dialog")
export class HaDialog extends DialogBase {
  protected readonly [FOCUS_TARGET];

  public scrollToPos(x: number, y: number) {
    this.contentElement?.scrollTo(x, y);
  }

  protected renderHeading() {
    return html`<slot name="heading"> ${super.renderHeading()} </slot>`;
  }

  protected firstUpdated(): void {
    super.firstUpdated();
    this.suppressDefaultPressSelector = [
      this.suppressDefaultPressSelector,
      SUPPRESS_DEFAULT_PRESS_SELECTOR,
    ].join(", ");
    this._updateScrolledAttribute();
    this.contentElement?.addEventListener("scroll", this._onScroll, {
      passive: true,
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.contentElement.removeEventListener("scroll", this._onScroll);
  }

  private _onScroll = () => {
    this._updateScrolledAttribute();
  };

  private _updateScrolledAttribute() {
    if (!this.contentElement) return;
    this.toggleAttribute("scrolled", this.contentElement.scrollTop !== 0);
  }

  static override styles = [
    styles,
    css`
      :host([scrolled]) ::slotted(ha-dialog-header) {
        border-bottom: 1px solid
          var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
      }
      .mdc-dialog {
        --mdc-dialog-scroll-divider-color: var(
          --dialog-scroll-divider-color,
          var(--divider-color)
        );
        z-index: var(--dialog-z-index, 8);
        -webkit-backdrop-filter: var(--dialog-backdrop-filter, none);
        backdrop-filter: var(--dialog-backdrop-filter, none);
        --mdc-dialog-box-shadow: var(--dialog-box-shadow, none);
        --mdc-typography-headline6-font-weight: 400;
        --mdc-typography-headline6-font-size: 1.574rem;
      }
      .mdc-dialog__actions {
        justify-content: var(--justify-action-buttons, flex-end);
        padding-bottom: max(env(safe-area-inset-bottom), 24px);
      }
      .mdc-dialog__actions span:nth-child(1) {
        flex: var(--secondary-action-button-flex, unset);
      }
      .mdc-dialog__actions span:nth-child(2) {
        flex: var(--primary-action-button-flex, unset);
      }
      .mdc-dialog__container {
        align-items: var(--vertical-align-dialog, center);
      }
      .mdc-dialog__title {
        padding: 24px 24px 0 24px;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      .mdc-dialog__actions {
        padding: 12px 24px 12px 24px;
      }
      .mdc-dialog__title::before {
        display: block;
        height: 0px;
      }
      .mdc-dialog .mdc-dialog__content {
        position: var(--dialog-content-position, relative);
        padding: var(--dialog-content-padding, 24px);
      }
      :host([hideactions]) .mdc-dialog .mdc-dialog__content {
        padding-bottom: max(
          var(--dialog-content-padding, 24px),
          env(safe-area-inset-bottom)
        );
      }
      .mdc-dialog .mdc-dialog__surface {
        position: var(--dialog-surface-position, relative);
        top: var(--dialog-surface-top);
        margin-top: var(--dialog-surface-margin-top);
        min-height: var(--mdc-dialog-min-height, auto);
        border-radius: var(--ha-dialog-border-radius, 28px);
      }
      :host([flexContent]) .mdc-dialog .mdc-dialog__content {
        display: flex;
        flex-direction: column;
      }
      .header_title {
        margin-right: 32px;
        margin-inline-end: 32px;
        margin-inline-start: initial;
        direction: var(--direction);
      }
      .header_button {
        position: absolute;
        right: 16px;
        top: 14px;
        text-decoration: none;
        color: inherit;
        inset-inline-start: initial;
        inset-inline-end: 16px;
        direction: var(--direction);
      }
      .dialog-actions {
        inset-inline-start: initial !important;
        inset-inline-end: 0px !important;
        direction: var(--direction);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog": HaDialog;
  }
}

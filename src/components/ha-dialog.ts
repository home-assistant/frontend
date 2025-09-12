import { DialogBase } from "@material/mwc-dialog/mwc-dialog-base";
import { styles } from "@material/mwc-dialog/mwc-dialog.css";
import { mdiClose } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement } from "lit/decorators";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import { nextRender } from "../common/util/render-status";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";

const SUPPRESS_DEFAULT_PRESS_SELECTOR = ["button", "ha-list-item"];

export const createCloseHeading = (
  hass: HomeAssistant | undefined,
  title: string | TemplateResult
) => html`
  <div class="header_title">
    <ha-icon-button
      .label=${hass?.localize("ui.common.close") ?? "Close"}
      .path=${mdiClose}
      dialogAction="close"
      class="header_button"
    ></ha-icon-button>
    <span>${title}</span>
  </div>
`;

@customElement("ha-dialog")
export class HaDialog extends DialogBase {
  protected readonly [FOCUS_TARGET];

  public scrollToPos(x: number, y: number) {
    this.contentElement?.scrollTo(x, y);
  }

  private _handleWaShow = () => {
    this._internalOpen = true;
    this.dispatchEvent(
      new CustomEvent("opened", { bubbles: true, composed: true })
    );
    this._handleDialogInitialFocus();
  };

  private _updateScrolledAttribute() {
    if (!this.contentElement) return;
    this.toggleAttribute("scrolled", this.contentElement.scrollTop !== 0);
  }

  private _handleDialogInitialFocus() {
    const candidates = this.querySelectorAll("[dialogInitialFocus]");
    if (!candidates.length) return;

    const computeFocusTarget = (el: Element): HTMLElement | null => {
      if (!(el instanceof HTMLElement)) return null;
      // If element itself is focusable or implements focus(), use it
      if (typeof el.focus === "function") {
        return el;
      }
      const focusableSelector = [
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",");
      return (
        (el.querySelector(focusableSelector) as HTMLElement | null) || null
      );
    };

    const el = candidates[0];
    const focusTarget = computeFocusTarget(el);
    if (!focusTarget) return;

    nextRender().then(() => {
      try {
        (focusTarget as HTMLElement).focus({ preventScroll: true });
      } catch (_e) {
        (focusTarget as HTMLElement).focus();
      }
    });
  }

  protected render() {
    return html`
      <wa-dialog
        .open=${this._internalOpen}
        .lightDismiss=${this.scrimClickAction}
        .withoutHeader=${!this.heading}
        @wa-show=${this._handleWaShow}
        @wa-hide=${this._handleWaHide}
        @wa-after-hide=${this._handleWaAfterHide}
        class=${this.open ? "mdc-dialog--open" : ""}
      >
        ${this.heading ? html`<div slot="label">${this.heading}</div>` : ""}
        <slot></slot>
        ${this.hideActions
          ? nothing
          : html`
              <slot name="secondaryAction" slot="footer"></slot>
              <slot name="primaryAction" slot="footer"></slot>
            `}
      </wa-dialog>
    `;
  }

  static override styles = css`
    :host {
      --dialog-z-index: 8;
      --dialog-backdrop-filter: none;
      --dialog-box-shadow: none;
      --ha-font-weight-normal: 400;
      --justify-action-buttons: flex-end;
      --vertical-align-dialog: center;
      --dialog-content-position: relative;
      --dialog-content-padding: 24px;
      --dialog-surface-position: relative;
      --dialog-surface-top: auto;
      --dialog-surface-margin-top: auto;
      --ha-dialog-border-radius: 24px;
      --ha-dialog-surface-backdrop-filter: none;
      --ha-dialog-surface-background: var(--mdc-theme-surface, #fff);
      --secondary-action-button-flex: unset;
      --primary-action-button-flex: unset;
    }

    wa-dialog {
      --spacing: var(--dialog-content-padding, 24px);
      --width: calc(
        var(--mdc-dialog-min-width, 100vw) - var(
            --safe-area-inset-left,
            0
          ) - var(--safe-area-inset-right, 0)
      );
      --show-duration: 200ms;
      --hide-duration: 200ms;
      z-index: var(--dialog-z-index, 8);
      /* Override Web Awesome's surface color with Home Assistant theme */
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      /* Set border radius */
      --wa-panel-border-radius: var(--ha-dialog-border-radius, 24px);
    }

    wa-dialog::part(header) {
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      padding: 24px 24px 0 24px;
    }

    wa-dialog::part(title) {
      margin: 0;
      margin-bottom: 8px;
      color: var(--mdc-dialog-heading-ink-color, rgba(0, 0, 0, 0.87));
      font-size: var(--mdc-typography-headline6-font-size, 1.574rem);
      line-height: var(--mdc-typography-headline6-line-height, 2rem);
      font-weight: var(
        --mdc-typography-headline6-font-weight,
        var(--ha-font-weight-normal)
      );
      letter-spacing: var(--mdc-typography-headline6-letter-spacing, 0.0125em);
      text-decoration: var(--mdc-typography-headline6-text-decoration, inherit);
      text-transform: var(--mdc-typography-headline6-text-transform, inherit);
    }

    wa-dialog::part(body) {
      position: var(--dialog-content-position, relative);
      padding: var(--dialog-content-padding, 24px);
    }

    wa-dialog::part(footer) {
      justify-content: flex-end;
      padding: 12px 16px 16px 16px;
    }

    wa-dialog::part(dialog) {
      max-width: calc(
        100vw - var(--safe-area-inset-left, 0) - var(--safe-area-inset-right, 0)
      );
      max-height: calc(
        100vh - var(--safe-area-inset-top, 0) - var(--safe-area-inset-bottom, 0)
      );
    }

    :host([flexContent]) wa-dialog::part(body) {
      display: flex;
      flex-direction: column;
    }

    :host([hideActions]) wa-dialog::part(body) {
      padding-bottom: var(--dialog-content-padding, 24px);
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      wa-dialog {
        --width: calc(
          100vw - var(--safe-area-inset-left, 0px) - var(
              --safe-area-inset-right,
              0px
            )
        );
      }
      wa-dialog::part(dialog) {
        min-height: calc(
          100vh - var(--safe-area-inset-top, 0px) - var(
              --safe-area-inset-bottom,
              0px
            )
        );
      }

      @media all and (max-width: 450px), all and (max-height: 500px) {
        .mdc-dialog .mdc-dialog__surface {
          min-height: 100vh;
          min-height: 100svh;
          max-height: 100vh;
          max-height: 100svh;
          padding-top: var(--safe-area-inset-top);
          padding-bottom: var(--safe-area-inset-bottom);
          padding-left: var(--safe-area-inset-left);
          padding-right: var(--safe-area-inset-right);
        }
      }

      .header_title {
        display: flex;
        align-items: center;
        direction: var(--direction);
      }
      .header_title span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
        padding-left: 4px;
        padding-right: 4px;
        margin-right: 12px;
        margin-inline-end: 12px;
        margin-inline-start: initial;
      }
      .header_button {
        text-decoration: none;
        color: inherit;
        inset-inline-start: initial;
        inset-inline-end: -12px;
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

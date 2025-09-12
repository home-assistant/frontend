import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "@home-assistant/webawesome/dist/components/dialog/dialog";
import { mdiClose } from "@mdi/js";
import { nextRender } from "../common/util/render-status";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import "./ha-icon-button";

@customElement("ha-wa-dialog")
export class HaWaDialog extends LitElement {
  protected readonly [FOCUS_TARGET];

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ reflect: true, attribute: "escape-key-action" })
  public escapeKeyAction?: string;

  @property({ type: Boolean, reflect: true, attribute: "overlay-click-action" })
  public overlayClickAction = false;

  @property({ type: Boolean, reflect: true, attribute: "hideactions" })
  public hideActions = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @property()
  public heading?: string | TemplateResult;

  @state()
  private _internalOpen = false;

  @state()
  private _hasCustomHeadingSlot = false;

  @query("wa-dialog")
  private _waDialog?: any;

  public scrollToPos(x: number, y: number) {
    this._waDialog?.scrollTo(x, y);
  }

  private _handleWaShow = () => {
    this._internalOpen = true;
    this.dispatchEvent(
      new CustomEvent("opened", { bubbles: true, composed: true })
    );
    this._handleDialogInitialFocus();
    this._setupDialogKeydown();
    this._addDialogActionListener();
  };

  private _handleWaHide = (ev?: CustomEvent) => {
    // Prevent closing via Escape when escapeKeyAction is empty string
    if (this.escapeKeyAction === "" && ev?.detail?.source === this._waDialog) {
      ev?.preventDefault?.();
      return;
    }
    this._internalOpen = false;
    this.dispatchEvent(
      new CustomEvent("closed", {
        bubbles: true,
        composed: true,
        detail: { action: "close" },
      })
    );
  };

  private _onDialogActionClick = (ev: Event) => {
    const path = (ev.composedPath?.() ?? []) as EventTarget[];
    const actionEl = path.find(
      (n) =>
        n instanceof HTMLElement &&
        (n as HTMLElement).hasAttribute("dialogAction")
    ) as HTMLElement | undefined;
    if (!actionEl) return;
    // Read attribute for parity with legacy API; value not required here
    actionEl.getAttribute("dialogAction");
    // For compatibility, any dialogAction should trigger a close of the dialog
    // (e.g. "close", "cancel").
    if (this._waDialog?.hide) {
      this._waDialog.hide();
    } else {
      this._internalOpen = false;
      this._handleWaHide();
    }
    // Prevent duplicate handling upstream
    ev.stopPropagation();
  };

  private _addDialogActionListener() {
    // Listen for any clicks on elements with the legacy `dialogAction` attribute
    // from slotted heading and content.
    this.addEventListener("click", this._onDialogActionClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("click", this._onDialogActionClick);
  }

  private _onCloseClick = () => {
    if (this._waDialog?.hide) {
      this._waDialog.hide();
    } else {
      this._internalOpen = false;
      this._handleWaHide();
    }
  };

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    super.updated(changedProperties);

    if (changedProperties.has("open")) {
      this._internalOpen = this.open;
      if (this.open) {
        this._handleDialogInitialFocus();
      }
    }

    if (changedProperties.has("_hasCustomHeadingSlot")) {
      this.toggleAttribute("has-custom-heading", this._hasCustomHeadingSlot);
    }
  }

  private _setupDialogKeydown() {
    this._waDialog?.addEventListener("keydown", this._handleDialogKeydown);
  }

  private _handleDialogKeydown = (event: KeyboardEvent) => {
    // Suppress Escape key when escapeKeyAction is an empty string
    if (event.key === "Escape" && this.escapeKeyAction === "") {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      const primaryButton = this.querySelector(
        '[slot="primaryAction"]'
      ) as HTMLElement;
      if (primaryButton) {
        primaryButton.click();
      }
    }
  };

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
        .lightDismiss=${this.overlayClickAction}
        .withoutHeader=${!this.heading}
        @wa-show=${this._handleWaShow}
        @wa-hide=${this._handleWaHide}
        class=${this.open ? "mdc-dialog--open" : ""}
      >
        <slot
          name="heading"
          slot="label"
          @slotchange=${this._onHeadingSlotChange}
        ></slot>
        ${this.heading && !this._hasCustomHeadingSlot
          ? html`
              <div slot="label" class="header_title">
                <ha-icon-button
                  .label=${(this as any).hass?.localize?.("ui.common.close") ??
                  "Close"}
                  .path=${mdiClose}
                  class="header_button"
                  @click=${this._onCloseClick}
                ></ha-icon-button>
                <span>${this.heading}</span>
              </div>
            `
          : ""}
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

  private _onHeadingSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).length > 0;
    if (hasContent !== this._hasCustomHeadingSlot) {
      this._hasCustomHeadingSlot = hasContent;
    }
  };

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
      --width: min(580px, 95vw);
      --spacing: var(--dialog-content-padding, 24px);
      --show-duration: 200ms;
      --hide-duration: 200ms;
      z-index: var(--dialog-z-index, 8);
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      --wa-panel-border-radius: var(--ha-dialog-border-radius, 24px);
    }

    wa-dialog::part(header) {
      padding: 24px 24px 16px 24px;
    }

    :host([has-custom-heading]) wa-dialog::part(header) {
      padding: 0;
    }

    wa-dialog::part(close-button),
    wa-dialog::part(close-button__base) {
      display: none;
    }

    wa-dialog::part(title) {
      margin: 0;
      margin-bottom: 0;
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
      padding: 0 var(--dialog-content-padding, 24px)
        var(--dialog-content-padding, 24px) var(--dialog-content-padding, 24px);
    }

    wa-dialog::part(footer) {
      justify-content: flex-end;
      padding: 12px 16px 16px 16px;
      gap: 12px;
    }

    wa-dialog::part(dialog) {
      min-width: calc(
        var(--width, 100vw) - var(--safe-area-inset-left, 0px) - var(
            --safe-area-inset-right,
            0px
          )
      );
      max-width: calc(
        100vw - var(--safe-area-inset-left, 0px) - var(
            --safe-area-inset-right,
            0px
          )
      );
      max-height: calc(
        100vh - var(--safe-area-inset-top, 0px) - var(
            --safe-area-inset-bottom,
            0px
          )
      );
      position: var(--dialog-surface-position, relative);
      margin-top: var(--dialog-surface-margin-top, auto);
    }

    :host([flexcontent]) wa-dialog::part(body) {
      display: flex;
      flex-direction: column;
    }

    :host([hideactions]) wa-dialog::part(body) {
      padding-bottom: var(--dialog-content-padding, 24px);
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      :host {
        --ha-dialog-border-radius: 0px;
      }
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
      inset-inline-start: -12px;
      inset-inline-end: initial;
      direction: var(--direction);
    }

    .hidden {
      display: none !important;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wa-dialog": HaWaDialog;
  }
}

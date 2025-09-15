import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "@home-assistant/webawesome/dist/components/dialog/dialog";
import { mdiClose } from "@mdi/js";
import { nextRender } from "../common/util/render-status";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import "./ha-icon-button";

// Global scroll lock management to prevent background scrolling while dialogs are open
let waDialogScrollLockCount = 0;
let previousBodyOverflow: string | null = null;
let previousHtmlOverflow: string | null = null;
let previousBodyPaddingRight: string | null = null;

const lockDocumentScroll = () => {
  if (waDialogScrollLockCount === 0) {
    const htmlEl = document.documentElement as HTMLElement;
    const bodyEl = document.body as HTMLElement;
    previousHtmlOverflow = htmlEl.style.overflow || null;
    previousBodyOverflow = bodyEl.style.overflow || null;
    previousBodyPaddingRight = bodyEl.style.paddingRight || null;

    // Compensate for scrollbar to avoid layout shift on desktop
    const scrollbarWidth = window.innerWidth - htmlEl.clientWidth;
    if (scrollbarWidth > 0) {
      const computedPaddingRight = parseFloat(
        window.getComputedStyle(bodyEl).paddingRight || "0"
      );
      bodyEl.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
    }

    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
  }
  waDialogScrollLockCount += 1;
};

const unlockDocumentScroll = () => {
  if (waDialogScrollLockCount > 0) {
    waDialogScrollLockCount -= 1;
  }
  if (waDialogScrollLockCount === 0) {
    const htmlEl = document.documentElement as HTMLElement;
    const bodyEl = document.body as HTMLElement;
    if (previousHtmlOverflow !== null) {
      htmlEl.style.overflow = previousHtmlOverflow;
    } else {
      htmlEl.style.removeProperty("overflow");
    }
    if (previousBodyOverflow !== null) {
      bodyEl.style.overflow = previousBodyOverflow;
    } else {
      bodyEl.style.removeProperty("overflow");
    }
    if (previousBodyPaddingRight !== null) {
      bodyEl.style.paddingRight = previousBodyPaddingRight;
    } else {
      bodyEl.style.removeProperty("padding-right");
    }
    previousHtmlOverflow = null;
    previousBodyOverflow = null;
    previousBodyPaddingRight = null;
  }
};

@customElement("ha-wa-dialog")
export class HaWaDialog extends LitElement {
  protected readonly [FOCUS_TARGET];

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ reflect: true, attribute: "escape-key-action" })
  public escapeKeyAction?: string;

  @property({ type: Boolean, reflect: true, attribute: "scrim-click-action" })
  public scrimClickAction = false;

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

  private _waBodyEl?: HTMLElement | null;

  private _scrollLocked = false;

  private _observeBodyScroll(attach: boolean) {
    if (!this._waDialog) return;
    if (!this._waBodyEl) {
      this._waBodyEl = this._waDialog.shadowRoot?.querySelector(
        '[part="body"]'
      ) as HTMLElement | null;
    }
    const bodyEl = this._waBodyEl;
    if (!bodyEl) return;
    if (attach) {
      bodyEl.addEventListener("scroll", this._onScroll, { passive: true });
      this._updateScrolledAttribute();
    } else {
      bodyEl.removeEventListener("scroll", this._onScroll as EventListener);
    }
  }

  private _onScroll = () => {
    this._updateScrolledAttribute();
  };

  private _updateScrolledAttribute() {
    const scrollTop = (this._waBodyEl?.scrollTop ?? 0) as number;
    this.toggleAttribute("scrolled", scrollTop !== 0);
  }

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
    this._observeBodyScroll(true);
    if (!this._scrollLocked) {
      lockDocumentScroll();
      this._scrollLocked = true;
    }
  };

  private _handleWaHide = (ev?: CustomEvent) => {
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
    this._observeBodyScroll(false);
    if (this._scrollLocked) {
      unlockDocumentScroll();
      this._scrollLocked = false;
    }
  };

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observeBodyScroll(false);
    if (this._scrollLocked) {
      unlockDocumentScroll();
      this._scrollLocked = false;
    }
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
        this._observeBodyScroll(true);
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
      // If element itself is focusable or implements focus(), use it instead of the focusable selector
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

    :host([scrolled]) wa-dialog::part(header) {
      max-width: 100%;
      border-bottom: 1px solid
        var(--dialog-scroll-divider-color, var(--divider-color));
    }

    wa-dialog {
      --width: min(580px, 95vw);
      --spacing: var(--dialog-content-padding, 24px);
      --show-duration: 200ms;
      --hide-duration: 200ms;
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      --wa-panel-border-radius: var(--ha-dialog-border-radius, 24px);
      z-index: var(--dialog-z-index, 8);
      max-width: 100%;
    }

    wa-dialog::part(header) {
      max-width: 100%;
      padding: 24px 24px 16px 24px;
    }

    :host([has-custom-heading]) wa-dialog::part(header) {
      max-width: 100%;
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
      max-width: 100%;
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
        max-width: 100%;
      }
      wa-dialog::part(dialog) {
        min-height: calc(
          100vh - var(--safe-area-inset-top, 0px) - var(
              --safe-area-inset-bottom,
              0px
            )
        );
        max-width: 100%;
      }
    }

    .header_title {
      display: flex;
      align-items: center;
      direction: var(--direction);
      max-width: 100%;
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
      max-width: 0;
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

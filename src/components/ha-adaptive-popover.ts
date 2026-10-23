import "@home-assistant/webawesome/dist/components/popover/popover";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { ScrollLockMixin } from "../mixins/scroll-lock-mixin";
import { HaAdaptiveDialog } from "./ha-adaptive-dialog";

/**
 * Home Assistant adaptive popover component.
 *
 * Uses an anchored desktop popover when an anchor is available and falls back
 * to `ha-adaptive-dialog` otherwise.
 *
 * @cssprop --ha-adaptive-popover-min-width - Minimum popover width. Defaults to its width preset; 0 fits it to its content, up to that width.
 * @cssprop --ha-adaptive-popover-width - Width of a compact popover. Defaults to the medium dialog width.
 */
@customElement("ha-adaptive-popover")
export class HaAdaptivePopover extends ScrollLockMixin(HaAdaptiveDialog) {
  @property({ attribute: false })
  public dialogAnchor?: Element;

  /** Tighter spacing in the popover, for short content such as confirmations */
  @property({ type: Boolean, reflect: true }) public compact = false;

  /**
   * Names the popover when it has no header title to label it, such as when
   * its title lives in another shadow root
   */
  @property({ attribute: false }) public accessibleLabel?: string;

  private _allowPopoverHide = false;

  private _openPopoverAnimationFrame?: number;

  @state() private _popoverOpen = false;

  @state() private _shouldRenderPopover = false;

  @query("wa-popover") private _popoverElement?: HTMLElement;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      changedProperties.has("dialogAnchor") ||
      changedProperties.has("mode")
    ) {
      this._shouldRenderPopover = Boolean(
        this.dialogAnchor && this.mode !== "bottom-sheet"
      );

      if (!this._shouldRenderPopover) {
        this.unlockBodyScroll();
        this._cancelPopoverOpen();
        this._popoverOpen = false;
      }
    }

    if (
      changedProperties.has("open") &&
      !this.open &&
      this._shouldRenderPopover
    ) {
      this._allowPopoverHide = true;
      this._popoverOpen = false;
    }
  }

  protected updated() {
    if (this.open && this._shouldRenderPopover && !this._popoverOpen) {
      this._schedulePopoverOpen();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelPopoverOpen();
    this._allowPopoverHide = false;
  }

  public override render() {
    if (!this._shouldRenderPopover) {
      return super.render();
    }

    return html`
      <wa-popover
        .open=${this._popoverOpen}
        .anchor=${this.dialogAnchor ?? null}
        auto-size="vertical"
        auto-size-padding="16"
        without-arrow
        trap-focus
        role="dialog"
        aria-modal="true"
        aria-labelledby=${ifDefined(this._defaultAriaLabelledBy)}
        aria-label=${ifDefined(this.accessibleLabel)}
        aria-describedby=${ifDefined(this.ariaDescribedBy)}
        @pointerdown=${this._handlePopoverPointerDown}
        @wa-show=${this._handlePopoverShow}
        @wa-hide=${this._handlePopoverHide}
        @wa-after-show=${this._handlePopoverAfterShow}
        @wa-after-hide=${this._handlePopoverAfterHide}
      >
        <div class="popover-surface" @click=${this._handlePopoverClick}>
          ${
            this.withoutHeader
              ? nothing
              : html`<slot name="header">${this._renderHeaderContent()}</slot>`
          }
          <div class="content-wrapper">
            <div class="body"><slot></slot></div>
          </div>
          <slot name="footer"></slot>
        </div>
      </wa-popover>
    `;
  }

  private _schedulePopoverOpen() {
    if (this._openPopoverAnimationFrame !== undefined) {
      return;
    }

    this._openPopoverAnimationFrame = requestAnimationFrame(() => {
      this._openPopoverAnimationFrame = undefined;

      if (this.open && this._shouldRenderPopover) {
        this._popoverOpen = true;
      }
    });
  }

  private _cancelPopoverOpen() {
    if (this._openPopoverAnimationFrame === undefined) {
      return;
    }

    cancelAnimationFrame(this._openPopoverAnimationFrame);
    this._openPopoverAnimationFrame = undefined;
  }

  private _handlePopoverClick(ev: Event) {
    const shouldClose = ev
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          (node.getAttribute("data-dialog") === "close" ||
            node.getAttribute("data-popover") === "close" ||
            node.closest('[data-dialog="close"], [data-popover="close"]') !==
              null)
      );

    if (!shouldClose) {
      return;
    }

    this._allowPopoverHide = true;
    this._popoverOpen = false;
    this.open = false;
  }

  private _handlePopoverShow(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    this.lockBodyScroll();
    fireEvent(this, "opened");

    requestAnimationFrame(() => {
      (this.querySelector("[autofocus]") as HTMLElement | null)?.focus();
    });
  }

  private _handlePopoverHide(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    if (this.preventScrimClose && !this._allowPopoverHide) {
      ev.preventDefault();
      this._pulsePopover();
    }
  }

  private _handlePopoverAfterShow(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    fireEvent(this, "after-show");
  }

  private _handlePopoverAfterHide(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    this._popoverOpen = false;
    this.open = false;
    this.unlockBodyScroll();
    this._allowPopoverHide = false;
    fireEvent(this, "closed");
  }

  private _handlePopoverPointerDown(ev: PointerEvent) {
    const popover = this._popoverElement;
    const dialog = popover?.shadowRoot?.querySelector(
      "dialog"
    ) as HTMLDialogElement | null;
    const popoverBody = popover?.shadowRoot?.querySelector(".body");

    if (!dialog) {
      return;
    }

    const path = ev.composedPath();

    if (!path.includes(dialog) || (popoverBody && path.includes(popoverBody))) {
      return;
    }

    if (this.preventScrimClose) {
      this._pulsePopover();
      return;
    }

    this._allowPopoverHide = true;
    this._popoverOpen = false;
    this.open = false;
  }

  private _pulsePopover() {
    const popover = this._popoverElement;
    const popup = popover?.shadowRoot?.querySelector("wa-popup") as {
      popup?: HTMLElement;
    } | null;
    const popupElement = popup?.popup;

    if (!popupElement) {
      return;
    }

    popupElement.getAnimations().forEach((animation) => animation.cancel());
    popupElement.animate([{ scale: "1" }, { scale: "1.02" }, { scale: "1" }], {
      duration: 250,
      easing: "ease",
    });
  }

  static override get styles() {
    return [
      ...super.styles,
      css`
        wa-popover {
          --full-width: var(
            --ha-dialog-width-full,
            min(95vw, var(--safe-width))
          );
          --width: min(var(--ha-dialog-width-md, 580px), var(--full-width));
          --show-duration: var(
            --ha-dialog-show-duration,
            var(--ha-animation-duration-normal)
          );
          --hide-duration: var(
            --ha-dialog-hide-duration,
            var(--ha-animation-duration-normal)
          );
          --wa-color-surface-raised: var(
            --ha-dialog-surface-background,
            var(--card-background-color, var(--ha-color-surface-default))
          );
          --wa-panel-border-radius: var(
            --ha-dialog-border-radius,
            var(--ha-border-radius-3xl)
          );
          --max-width: var(--width);
        }

        wa-popover::part(dialog) {
          pointer-events: auto;
        }

        :host([width="small"]) wa-popover {
          --width: min(var(--ha-dialog-width-sm, 320px), var(--full-width));
        }

        :host([width="large"]) wa-popover {
          --width: min(var(--ha-dialog-width-lg, 1024px), var(--full-width));
        }

        :host([width="full"]) wa-popover {
          --width: var(--full-width);
        }

        wa-popover::part(body) {
          padding: 0;
          border-color: transparent;
          box-shadow: var(--dialog-box-shadow, var(--wa-shadow-l));
          /* 0 fits the popover to its content, up to its width */
          min-width: var(
            --ha-adaptive-popover-min-width,
            var(--width, var(--full-width))
          );
          max-width: var(--width);
          max-height: var(
            --ha-dialog-max-height,
            calc(var(--safe-height) - var(--ha-space-20))
          );
          overflow: hidden;
          color: var(--primary-text-color);
          backdrop-filter: var(--ha-dialog-surface-backdrop-filter, none);
          user-select: text;
        }

        .popover-surface {
          display: flex;
          flex-direction: column;
          min-height: 0;
          max-height: inherit;
        }

        .content-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .body {
          position: relative;
          padding: var(
            --dialog-content-padding,
            0 var(--ha-space-6) var(--ha-space-6) var(--ha-space-6)
          );
          overflow: auto;
          flex-grow: 1;
        }

        :host([flexcontent]) .body {
          max-width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        slot[name="footer"] {
          display: block;
          padding: 0;
        }

        /* 20px around the edges, 12px below the title and 16px above the
           footer. The header bar and its empty navigation icon slot already
           give the title 16px on the side. */
        :host([compact]) wa-popover {
          --ha-dialog-header-content-padding: var(--ha-space-5)
            var(--ha-space-1) var(--ha-space-3);
          --ha-dialog-header-min-height: 0;
          /* Content that sizes itself, such as a short message, can let the
             popover grow wider so text only wraps when there is no room */
          --width: var(
            --ha-adaptive-popover-width,
            min(var(--ha-dialog-width-md, 580px), var(--full-width))
          );
          --ha-dialog-header-white-space: normal;
          --ha-dialog-header-title-height: auto;
          --dialog-content-padding: 0 var(--ha-space-5);
        }

        /* 18px beside and below the buttons looks even with the 20px around
           the text */
        /* Without a header the content starts the popover, so it takes the
           header's place at the top */
        :host([compact][without-header]) wa-popover {
          --dialog-content-padding: var(--ha-space-5) var(--ha-space-5) 0;
        }

        :host([compact]) ::slotted([slot="footer"]) {
          padding: var(--ha-space-4) 18px 18px var(--ha-space-5);
        }

        ::slotted([slot="footer"]) {
          display: flex;
          padding: var(--ha-space-3) var(--ha-space-4) var(--ha-space-4)
            var(--ha-space-4);
          gap: var(--ha-space-3);
          justify-content: flex-end;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-adaptive-popover": HaAdaptivePopover;
  }

  interface HASSDomEvents {
    opened: undefined;
    "after-show": undefined;
    closed: undefined;
  }
}

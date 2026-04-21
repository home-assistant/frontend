import "@home-assistant/webawesome/dist/components/popover/popover";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { listenMediaQuery } from "../common/dom/media_query";
import { ScrollLockMixin } from "../mixins/scroll-lock-mixin";
import { HaAdaptiveDialog } from "./ha-adaptive-dialog";

/**
 * Home Assistant adaptive popover component.
 *
 * Uses an anchored desktop popover when an anchor is available and falls back
 * to `ha-adaptive-dialog` otherwise.
 */
@customElement("ha-adaptive-popover")
export class HaAdaptivePopover extends ScrollLockMixin(HaAdaptiveDialog) {
  @property({ attribute: false })
  public dialogAnchor?: Element;

  @state() private _narrow = false;

  @state() private _popoverOpen = false;

  private _unsubPopoverMediaQuery?: () => void;

  private _allowPopoverHide = false;

  private _openPopoverAnimationFrame?: number;

  connectedCallback() {
    super.connectedCallback();
    this._unsubPopoverMediaQuery = listenMediaQuery(
      "(max-width: 870px), (max-height: 500px)",
      (matches) => {
        if (!this.open || this.allowModeChange) {
          this._narrow = matches;
        }
      }
    );
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      changedProperties.has("open") &&
      !this.open &&
      this._shouldRenderPopover()
    ) {
      this._allowPopoverHide = true;
      this._popoverOpen = false;
    }

    if (!this._shouldRenderPopover()) {
      this.unlockBodyScroll();
      this._cancelPopoverOpen();
      this._popoverOpen = false;
    }
  }

  protected updated() {
    if (this.open && this._shouldRenderPopover() && !this._popoverOpen) {
      this._schedulePopoverOpen();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelPopoverOpen();
    this._unsubPopoverMediaQuery?.();
    this._unsubPopoverMediaQuery = undefined;
    this._allowPopoverHide = false;
  }

  public override render() {
    if (!this._shouldRenderPopover()) {
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
        aria-labelledby=${ifDefined(
          this.ariaLabelledBy ||
            (this.headerTitle !== undefined ? "ha-dialog-title" : undefined)
        )}
        aria-describedby=${ifDefined(this.ariaDescribedBy)}
        @wa-show=${this._handlePopoverShow}
        @wa-hide=${this._handlePopoverHide}
        @wa-after-show=${this._handlePopoverAfterShow}
        @wa-after-hide=${this._handlePopoverAfterHide}
      >
        <div class="popover-surface" @click=${this._handlePopoverClick}>
          ${this.withoutHeader
            ? ""
            : html`<slot name="header">${this._renderHeaderContent()}</slot>`}
          <div class="content-wrapper">
            <div class="body"><slot></slot></div>
          </div>
          <slot name="footer"></slot>
        </div>
      </wa-popover>
    `;
  }

  private _shouldRenderPopover() {
    return Boolean(this.dialogAnchor && !this._narrow);
  }

  private _schedulePopoverOpen() {
    if (this._openPopoverAnimationFrame !== undefined) {
      return;
    }

    this._openPopoverAnimationFrame = requestAnimationFrame(() => {
      this._openPopoverAnimationFrame = undefined;

      if (this.open && this._shouldRenderPopover()) {
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
          --wa-color-surface-border: transparent;
          --max-width: var(--width);
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
          box-shadow: var(--dialog-box-shadow, var(--wa-shadow-l));
          min-width: var(--width, var(--full-width));
          max-width: var(--width);
          max-height: var(
            --ha-dialog-max-height,
            calc(var(--safe-height) - var(--ha-space-20))
          );
          overflow: hidden;
          color: var(--primary-text-color);
          -webkit-backdrop-filter: var(
            --ha-dialog-surface-backdrop-filter,
            none
          );
          backdrop-filter: var(--ha-dialog-surface-backdrop-filter, none);
          -webkit-user-select: text;
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

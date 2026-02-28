import "@home-assistant/webawesome/dist/components/drawer/drawer";
import type WaDrawer from "@home-assistant/webawesome/dist/components/drawer/drawer";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import { SwipeGestureRecognizer } from "../common/util/swipe-gesture-recognizer";
import { ScrollableFadeMixin } from "../mixins/scrollable-fade-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import { isIosApp } from "../util/is_ios";

export const BOTTOM_SHEET_ANIMATION_DURATION_MS = 300;

const SWIPE_LOCKED_COMPONENTS = new Set([
  "ha-control-slider",
  "ha-slider",
  "ha-control-switch",
  "ha-control-circular-slider",
  "ha-hs-color-picker",
  "ha-map",
  "ha-more-info-control-select-container",
  "ha-filter-chip",
]);

const SWIPE_LOCKED_CLASSES = new Set(["volume-slider-container", "forecast"]);

/**
 * Home Assistant bottom sheet component.
 *
 * @element ha-bottom-sheet
 * @extends {LitElement}
 *
 * @cssprop --ha-bottom-sheet-height - Preferred height of the bottom sheet.
 * @cssprop --ha-bottom-sheet-max-height - Maximum height of the bottom sheet.
 * @cssprop --ha-bottom-sheet-max-width - Maximum width of the bottom sheet.
 * @cssprop --ha-bottom-sheet-border-radius - Top border radius of the bottom sheet.
 * @cssprop --ha-bottom-sheet-surface-background - Bottom sheet background color.
 * @cssprop --ha-bottom-sheet-surface-backdrop-filter - Bottom sheet surface backdrop filter.
 * @cssprop --ha-bottom-sheet-scrim-backdrop-filter - Bottom sheet scrim backdrop filter.
 * @cssprop --ha-bottom-sheet-scrim-color - Bottom sheet scrim color.
 *
 * @cssprop --ha-dialog-surface-background - Bottom sheet background color fallback.
 * @cssprop --ha-dialog-surface-backdrop-filter - Bottom sheet surface backdrop filter fallback.
 * @cssprop --ha-dialog-scrim-backdrop-filter - Bottom sheet scrim backdrop filter fallback.
 * @cssprop --dialog-backdrop-filter - Bottom sheet scrim backdrop filter legacy fallback.
 * @cssprop --mdc-dialog-scrim-color - Bottom sheet scrim color legacy fallback.
 */
@customElement("ha-bottom-sheet")
export class HaBottomSheet extends ScrollableFadeMixin(LitElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: "aria-labelledby" })
  public ariaLabelledBy?: string;

  @property({ attribute: "aria-describedby" })
  public ariaDescribedBy?: string;

  @property({ type: Boolean }) public open = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @property({ type: Boolean, reflect: true, attribute: "prevent-scrim-close" })
  public preventScrimClose = false;

  @state() private _drawerOpen = false;

  @state() private _sliderInteractionActive = false;

  @query("#drawer") private _drawer!: HTMLElement;

  @query("#body") private _bodyElement!: HTMLDivElement;

  protected get scrollableElement(): HTMLElement | null {
    return this._bodyElement;
  }

  private _gestureRecognizer = new SwipeGestureRecognizer();

  private _isDragging = false;

  private _escapePressed = false;

  private _handleShow = async () => {
    this._drawerOpen = true;
    this.open = true;
    fireEvent(this, "opened");

    await this.updateComplete;

    requestAnimationFrame(() => {
      if (this.hass && isIosApp(this.hass)) {
        const element = this.renderRoot.querySelector("[autofocus]");
        if (element !== null) {
          if (!element.id) {
            element.id = "ha-bottom-sheet-autofocus";
          }
          this.hass.auth.external?.fireMessage({
            type: "focus_element",
            payload: {
              element_id: element.id,
            },
          });
        }
        return;
      }
      (
        this.renderRoot.querySelector("[autofocus]") as HTMLElement | null
      )?.focus();
    });
  };

  private _handleAfterShow = () => {
    fireEvent(this, "after-show");
  };

  private _handleSliderInteractionStart = () => {
    this._sliderInteractionActive = true;
  };

  private _handleSliderInteractionStop = () => {
    this._sliderInteractionActive = false;
  };

  private _handleAfterHide = (ev: CustomEvent<{ source: Element }>) => {
    if (this._sliderInteractionActive) {
      this._drawerOpen = true;
      this.open = true;
      return;
    }

    if (ev.eventPhase === Event.AT_TARGET) {
      this.open = false;
      this._drawerOpen = false;
      fireEvent(this, "closed");
    }
  };

  private _handleHide = (ev: CustomEvent<{ source: Element }>) => {
    // Ignore bubbled wa-hide events from nested drawers (e.g., picker bottom sheet)
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    const sourceIsDrawer = ev.detail.source === (ev.target as WaDrawer).drawer;

    if (this._sliderInteractionActive) {
      ev.preventDefault();
      this._drawerOpen = true;
      this.open = true;
      this._escapePressed = false;
      return;
    }
    if (this.preventScrimClose && this._escapePressed && sourceIsDrawer) {
      ev.preventDefault();
    }

    this._escapePressed = false;
  };

  private _handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      this._escapePressed = true;
      if (this.preventScrimClose) {
        ev.preventDefault();
      }
      ev.stopPropagation();
      (ev.currentTarget as WaDrawer).open = false;
    }
  };

  private _handleCloseAction = (ev: Event) => {
    const shouldClose = ev
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          (node.getAttribute("data-dialog") === "close" ||
            node.getAttribute("data-drawer") === "close")
      );

    if (shouldClose) {
      this._drawerOpen = false;
    }
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      "slider-interaction-start",
      this._handleSliderInteractionStart,
      {
        capture: true,
      }
    );
    this.addEventListener(
      "slider-interaction-stop",
      this._handleSliderInteractionStop,
      {
        capture: true,
      }
    );
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("open")) {
      this._drawerOpen = this.open;
    }
  }

  render() {
    return html`
      <wa-drawer
        id="drawer"
        placement="bottom"
        .open=${this._drawerOpen}
        .lightDismiss=${!this.preventScrimClose}
        .ariaLabelledby=${this.ariaLabelledBy}
        .ariaDescribedby=${this.ariaDescribedBy}
        @keydown=${this._handleKeyDown}
        @wa-show=${this._handleShow}
        @wa-after-show=${this._handleAfterShow}
        @wa-hide=${this._handleHide}
        @wa-after-hide=${this._handleAfterHide}
        @click=${this._handleCloseAction}
        without-header
        @touchstart=${this._handleTouchStart}
      >
        <div class="handle-wrapper" aria-hidden="true">
          <div class="handle"></div>
        </div>
        <slot name="header"></slot>
        <div class="content-wrapper">
          <div id="body" class="body ha-scrollbar">
            <slot></slot>
          </div>
          ${this.renderScrollableFades()}
        </div>
        <slot name="footer"></slot>
      </wa-drawer>
    `;
  }

  private _handleTouchStart = (ev: TouchEvent) => {
    if (this.preventScrimClose) {
      return;
    }

    const path = ev.composedPath();

    for (const target of path) {
      if (target === this._drawer) {
        break;
      }

      if (!(target instanceof HTMLElement)) {
        continue;
      }

      if (
        // Check if any element inside drawer in the composed path has scrollTop > 0 (list)
        target.scrollTop > 0 ||
        // Check if the element is a swipe locked component or has a swipe locked class
        SWIPE_LOCKED_COMPONENTS.has(target.localName) ||
        Array.from(target.classList).some((cls) =>
          SWIPE_LOCKED_CLASSES.has(cls)
        )
      ) {
        return;
      }
    }

    // Stop propagation so parent bottom sheets don't also start tracking
    // this gesture (same pattern as _handleKeyDown for Escape)
    ev.stopPropagation();
    this._startResizing(ev.touches[0].clientY);
  };

  private _startResizing(clientY: number) {
    // register event listeners for drag handling
    document.addEventListener("touchmove", this._handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._handleTouchEnd);
    document.addEventListener("touchcancel", this._handleTouchEnd);

    this._gestureRecognizer.start(clientY);
  }

  private _handleTouchMove = (ev: TouchEvent) => {
    const currentY = ev.touches[0].clientY;
    const delta = this._gestureRecognizer.move(currentY);

    if (delta < 0) {
      ev.preventDefault();
      this._isDragging = true;
      requestAnimationFrame(() => {
        if (this._isDragging) {
          this.style.setProperty(
            "--dialog-transform",
            `translateY(${delta * -1}px)`
          );
        }
      });
    }
  };

  private _animateSnapBack() {
    // Add transition for smooth animation
    this.style.setProperty(
      "--dialog-transition",
      `transform ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms ease-out`
    );

    // Reset transform to snap back
    this.style.removeProperty("--dialog-transform");

    // Remove transition after animation completes
    setTimeout(() => {
      this.style.removeProperty("--dialog-transition");
    }, BOTTOM_SHEET_ANIMATION_DURATION_MS);
  }

  private _handleTouchEnd = () => {
    this._unregisterResizeHandlers();

    this._isDragging = false;

    const result = this._gestureRecognizer.end();

    // If velocity exceeds threshold, use velocity direction to determine action
    if (result.isSwipe) {
      if (result.isDownwardSwipe) {
        // Downward swipe - close the bottom sheet
        this._drawerOpen = false;
      } else {
        // Upward swipe - keep open and animate back
        this._animateSnapBack();
      }
      return;
    }

    // If velocity is below threshold, use position-based logic
    // Get the drawer height to calculate 50% threshold
    const drawerBody = this._drawer.shadowRoot?.querySelector(
      '[part="body"]'
    ) as HTMLElement;
    const drawerHeight = drawerBody?.offsetHeight || 0;

    // delta is negative when dragging down
    // Close if dragged down past 50% of the drawer height
    if (
      drawerHeight > 0 &&
      result.delta < 0 &&
      Math.abs(result.delta) > drawerHeight * 0.5
    ) {
      this._drawerOpen = false;
    } else {
      this._animateSnapBack();
    }
  };

  private _unregisterResizeHandlers = () => {
    document.removeEventListener("touchmove", this._handleTouchMove);
    document.removeEventListener("touchend", this._handleTouchEnd);
    document.removeEventListener("touchcancel", this._handleTouchEnd);
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "slider-interaction-start",
      this._handleSliderInteractionStart,
      {
        capture: true,
      }
    );
    this.removeEventListener(
      "slider-interaction-stop",
      this._handleSliderInteractionStop,
      {
        capture: true,
      }
    );
    this._unregisterResizeHandlers();
    this._isDragging = false;
  }

  static get styles() {
    return [
      ...super.styles,
      haStyleScrollbar,
      css`
        wa-drawer {
          --wa-color-surface-raised: transparent;
          --spacing: 0;
          --size: var(--ha-bottom-sheet-height, auto);
          --show-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
          --hide-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
        }
        wa-drawer::part(dialog) {
          max-height: var(--ha-bottom-sheet-max-height, 90vh);
          align-items: center;
          transform: var(--dialog-transform);
          transition: var(--dialog-transition);
        }
        wa-drawer::part(dialog)::backdrop {
          -webkit-backdrop-filter: var(
            --ha-bottom-sheet-scrim-backdrop-filter,
            var(
              --ha-dialog-scrim-backdrop-filter,
              var(--dialog-backdrop-filter, none)
            )
          );
          backdrop-filter: var(
            --ha-bottom-sheet-scrim-backdrop-filter,
            var(
              --ha-dialog-scrim-backdrop-filter,
              var(--dialog-backdrop-filter, none)
            )
          );
          background-color: var(
            --ha-bottom-sheet-scrim-color,
            var(--mdc-dialog-scrim-color, none)
          );
        }
        wa-drawer::part(body) {
          max-width: var(--ha-bottom-sheet-max-width);
          width: 100%;
          position: relative;
          border-top-left-radius: var(
            --ha-bottom-sheet-border-radius,
            var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
          );
          border-top-right-radius: var(
            --ha-bottom-sheet-border-radius,
            var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
          );
          background-color: var(
            --ha-bottom-sheet-surface-background,
            var(
              --ha-dialog-surface-background,
              var(--card-background-color, var(--ha-color-surface-default))
            )
          );
          -webkit-backdrop-filter: var(
            --ha-bottom-sheet-surface-backdrop-filter,
            var(--ha-dialog-surface-backdrop-filter, none)
          );
          backdrop-filter: var(
            --ha-bottom-sheet-surface-backdrop-filter,
            var(--ha-dialog-surface-backdrop-filter, none)
          );
          padding: var(
            --ha-bottom-sheet-padding,
            0 var(--safe-area-inset-right) var(--safe-area-inset-bottom)
              var(--safe-area-inset-left)
          );
        }
        :host([flexcontent]) wa-drawer::part(body) {
          display: flex;
          flex-direction: column;
        }
        :host([prevent-scrim-close]) .handle-wrapper {
          display: none;
        }
        .handle-wrapper {
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          width: 100%;
          padding-bottom: 2px;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          z-index: 1;
        }
        .handle-wrapper .handle {
          height: 16px;
          width: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .handle-wrapper .handle::after {
          content: "";
          border-radius: var(--ha-border-radius-md);
          height: 4px;
          background: var(--ha-bottom-sheet-handle-color, var(--divider-color));
          width: 40px;
        }
        .content-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .body {
          padding: var(--ha-bottom-sheet-content-padding, 0);
          box-sizing: border-box;
        }
        :host([flexcontent]) .body {
          flex: 1;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          padding: var(
            --ha-bottom-sheet-content-padding,
            var(
              --ha-bottom-sheet-padding,
              0 var(--safe-area-inset-right) var(--safe-area-inset-bottom)
                var(--safe-area-inset-left)
            )
          );
          box-sizing: border-box;
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
        :host([flexcontent]) slot[name="footer"] {
          flex-shrink: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HASSDomEvents {
    "slider-interaction-start": undefined;
    "slider-interaction-stop": undefined;
  }
  interface HTMLElementEventMap {
    "slider-interaction-start": HASSDomEvent<
      HASSDomEvents["slider-interaction-start"]
    >;
    "slider-interaction-stop": HASSDomEvent<
      HASSDomEvents["slider-interaction-stop"]
    >;
  }
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}

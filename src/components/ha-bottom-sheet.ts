import "@home-assistant/webawesome/dist/components/drawer/drawer";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { SwipeGestureRecognizer } from "../common/util/swipe-gesture-recognizer";
import { haStyleScrollbar } from "../resources/styles";

export const BOTTOM_SHEET_ANIMATION_DURATION_MS = 300;

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends LitElement {
  @property({ type: Boolean }) public open = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state() private _drawerOpen = false;

  @query("#drawer") private _drawer!: HTMLElement;

  private _gestureRecognizer = new SwipeGestureRecognizer();

  private _isDragging = false;

  private _handleAfterHide(afterHideEvent: Event) {
    afterHideEvent.stopPropagation();
    this.open = false;
    const ev = new Event("closed", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(ev);
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
        @wa-after-hide=${this._handleAfterHide}
        without-header
        @touchstart=${this._handleTouchStart}
      >
        <slot name="header"></slot>
        <div id="body" class="body ha-scrollbar">
          <slot></slot>
        </div>
      </wa-drawer>
    `;
  }

  private _handleTouchStart = (ev: TouchEvent) => {
    // Check if any element inside drawer in the composed path has scrollTop > 0
    for (const path of ev.composedPath()) {
      const el = path as HTMLElement;
      if (el === this._drawer) {
        break;
      }
      if (el.scrollTop > 0) {
        return;
      }
    }

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
    this._unregisterResizeHandlers();
    this._isDragging = false;
  }

  static styles = [
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
      wa-drawer::part(body) {
        max-width: var(--ha-bottom-sheet-max-width);
        width: 100%;
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
          var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff)),
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
      :host([flexcontent]) .body {
        flex: 1;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        padding: var(
          --ha-bottom-sheet-padding,
          0 var(--safe-area-inset-right) var(--safe-area-inset-bottom)
            var(--safe-area-inset-left)
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}

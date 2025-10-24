import "@home-assistant/webawesome/dist/components/drawer/drawer";
import { css, html, LitElement, type PropertyValues } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { haStyleScrollbar } from "../resources/styles";

export const BOTTOM_SHEET_ANIMATION_DURATION_MS = 300;

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends LitElement {
  @property({ type: Boolean }) public open = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state() private _drawerOpen = false;

  @query(".body") public bodyContainer!: HTMLDivElement;

  private _lockResize = false;

  private _lockResizeByChild = false;

  private _resizeStartY = 0;

  private _resizeDelta = 0;

  private _handleAfterHide() {
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
        placement="bottom"
        .open=${this._drawerOpen}
        @wa-after-hide=${this._handleAfterHide}
        without-header
        @touchstart=${this._handleTouchStart}
      >
        <slot name="header"></slot>
        <div
          class="body ha-scrollbar"
          @scroll=${this._handleScroll}
          @bottom-sheet-lock-resize-changed=${this._handleLockResizeByChild}
        >
          <slot></slot>
        </div>
      </wa-drawer>
    `;
  }

  @eventOptions({ passive: true })
  private _handleScroll(ev: Event) {
    const target = ev.target as HTMLElement;
    this._lockResize = target.scrollTop > 0;
  }

  private _handleLockResizeByChild = (ev: CustomEvent<boolean>) => {
    this._lockResizeByChild = ev.detail;

    if (this._lockResizeByChild) {
      this._endResizing();
    }
  };

  private _handleTouchStart = (ev: TouchEvent) => {
    if (this._lockResize || this._lockResizeByChild) {
      return;
    }

    this._startResizing(ev.touches[0].clientY);
  };

  private _startResizing(clientY: number) {
    // register event listeners for drag handling
    document.addEventListener("touchmove", this._handleMouseMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._endResizing);
    document.addEventListener("touchcancel", this._endResizing);

    this._resizeStartY = clientY;
  }

  private _handleMouseMove = (ev: TouchEvent) => {
    this._resizeDelta = this._resizeStartY - ev.touches[0].clientY;
    if (this._resizeDelta < 0) {
      ev.preventDefault();
      requestAnimationFrame(() => {
        this.style.setProperty(
          "--dialog-transform",
          `translateY(${this._resizeDelta * -1}px)`
        );
      });
    }
  };

  private _endResizing = () => {
    this._unregisterResizeHandlers();

    if (this._resizeDelta > -50) {
      this.style.removeProperty("--dialog-transform");
      return;
    }

    this._drawerOpen = false;
  };

  private _unregisterResizeHandlers = () => {
    document.removeEventListener("touchmove", this._handleMouseMove);
    document.removeEventListener("touchend", this._unregisterResizeHandlers);
    document.removeEventListener("touchcancel", this._unregisterResizeHandlers);
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unregisterResizeHandlers();
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

  interface HASSDomEvents {
    "bottom-sheet-lock-resize-changed": boolean;
  }
}

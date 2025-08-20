import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./webawesome/ha-wa-drawer";

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends LitElement {
  @state() private _size = 30;

  private _dragging = false;

  private _dragStartY = 0;

  private _initialSize = 0;

  render() {
    return html`<ha-wa-drawer
      open
      without-header
      placement="bottom"
      .lightDismiss=${false}
      hide-backdrop
      style=${`--size: ${this._size}vh;`}
    >
      <div
        class="handle-wrapper"
        @mousedown=${this._handleMouseDown}
        @touchstart=${this._handleTouchStart}
      >
        <div class="handle"></div>
      </div>
      <slot></slot>
    </ha-wa-drawer>`;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("mousemove", this._handleMouseMove);
    document.addEventListener("mouseup", this._handleMouseUp);
    // Use non-passive listeners so we can call preventDefault to block
    // browser pull-to-refresh and page scrolling while dragging.
    document.addEventListener("touchmove", this._handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._handleTouchEnd);
    document.addEventListener("touchcancel", this._handleTouchEnd);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("mousemove", this._handleMouseMove);
    document.removeEventListener("mouseup", this._handleMouseUp);
    document.removeEventListener("touchmove", this._handleTouchMove);
    document.removeEventListener("touchend", this._handleTouchEnd);
    document.removeEventListener("touchcancel", this._handleTouchEnd);
  }

  private _handleMouseDown = (ev: MouseEvent) => {
    this._startDrag(ev.clientY);
  };

  private _handleTouchStart = (ev: TouchEvent) => {
    // Prevent the browser from interpreting this as a scroll/PTR gesture.
    ev.preventDefault();
    this._startDrag(ev.touches[0].clientY);
  };

  private _startDrag(clientY: number) {
    this._dragging = true;
    this._dragStartY = clientY;
    this._initialSize = this._size;
    document.body.style.cursor = "grabbing";
  }

  private _handleMouseMove = (ev: MouseEvent) => {
    if (!this._dragging) return;
    this._updateSize(ev.clientY);
  };

  private _handleTouchMove = (ev: TouchEvent) => {
    if (!this._dragging) return;
    ev.preventDefault(); // Prevent scrolling
    this._updateSize(ev.touches[0].clientY);
  };

  private _updateSize(clientY: number) {
    const deltaY = this._dragStartY - clientY;
    const viewportHeight = window.innerHeight;
    const deltaVh = (deltaY / viewportHeight) * 100;

    // Calculate new size and clamp between 10vh and 90vh
    let newSize = this._initialSize + deltaVh;
    newSize = Math.max(10, Math.min(90, newSize));

    this._size = newSize;

    if (newSize < 20) {
      fireEvent(this, "close-bottom-sheet");
    }
  }

  private _handleMouseUp = () => {
    this._endDrag();
  };

  private _handleTouchEnd = () => {
    this._endDrag();
  };

  private _endDrag() {
    if (!this._dragging) return;
    this._dragging = false;
    document.body.style.cursor = "";
  }

  static styles = css`
    :host {
      --size: 30vh;
      --size: 30dvh;
      overscroll-behavior: contain;
    }
    .handle-wrapper {
      width: 100%;
      height: 32px;
      padding-bottom: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: grab;
      touch-action: none;
    }
    .handle-wrapper:active {
      cursor: grabbing;
    }
    .handle-wrapper .handle {
      border-radius: 8px;
      height: 4px;
      background: var(--divider-color, #e0e0e0);
      width: 80px;
      transition: background-color 0.2s ease;
      pointer-events: none;
    }
    ha-wa-drawer::part(dialog) {
      box-shadow: 0px -8px 16px rgba(0, 0, 0, 0.2);
      border-top-left-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-top-right-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
    }
    ha-wa-drawer::part(body) {
      padding: 0;
      overflow: hidden;
      overscroll-behavior: contain;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }

  interface HASSDomEvents {
    "close-bottom-sheet": undefined;
  }
}

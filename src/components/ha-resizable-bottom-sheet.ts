import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { BOTTOM_SHEET_ANIMATION_DURATION_MS } from "./ha-bottom-sheet";

const MAX_VIEWPOINT_HEIGHT = 90;
const MIN_VIEWPOINT_HEIGHT = 20;

/**
 * A bottom sheet component that slides up from the bottom of the screen.
 *
 * The bottom sheet provides a draggable interface that allows users to resize
 * the sheet by dragging the handle at the top. It supports both mouse and touch
 * interactions and automatically closes when dragged below a 20% of screen height.
 *
 * @fires bottom-sheet-closed - Fired when the bottom sheet is closed
 *
 * @cssprop --ha-bottom-sheet-border-width - Border width for the sheet
 * @cssprop --ha-bottom-sheet-border-style - Border style for the sheet
 * @cssprop --ha-bottom-sheet-border-color - Border color for the sheet
 */
@customElement("ha-resizable-bottom-sheet")
export class HaResizableBottomSheet extends LitElement {
  @query("dialog") private _dialog!: HTMLDialogElement;

  private _dragging = false;

  private _dragStartY = 0;

  private _initialSize = 0;

  @state() private _dialogMaxViewpointHeight = 70;

  @state() private _dialogMinViewpointHeight = 55;

  @state() private _dialogViewportHeight?: number;

  @property({ type: Boolean, reflect: true })
  public fullscreen = false;

  render() {
    return html`<dialog
      open
      @transitionend=${this._handleTransitionEnd}
      style=${styleMap({
        height: this.fullscreen
          ? "100vh"
          : this._dialogViewportHeight
            ? `${this._dialogViewportHeight}vh`
            : "auto",
        maxHeight: `${this.fullscreen ? 100 : this._dialogMaxViewpointHeight}vh`,
        minHeight: `${this._dialogMinViewpointHeight}vh`,
      })}
    >
      ${!this.fullscreen
        ? html` <div class="handle-wrapper">
            <div
              @mousedown=${this._handleMouseDown}
              @touchstart=${this._handleTouchStart}
              class="handle"
            ></div>
          </div>`
        : nothing}
      <slot></slot>
    </dialog>`;
  }

  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this._openSheet();
  }

  private _openSheet() {
    requestAnimationFrame(() => {
      // trigger opening animation
      this._dialog.classList.add("show");
    });
  }

  public closeSheet() {
    requestAnimationFrame(() => {
      this._dialog.classList.remove("show");
    });
  }

  private _handleTransitionEnd() {
    if (this._dialog.classList.contains("show")) {
      // after show animation is done
      // - set the height to the natural height, to prevent content shift when switch content
      // - set max height to 90vh, so it opens at max 70vh but can be resized to 90vh
      this._dialogViewportHeight =
        (this._dialog.offsetHeight / window.innerHeight) * 100;
      this._dialogMaxViewpointHeight = MAX_VIEWPOINT_HEIGHT;
      this._dialogMinViewpointHeight = MIN_VIEWPOINT_HEIGHT;
    } else {
      // after close animation is done close dialog element and fire closed event
      this._dialog.close();
      fireEvent(this, "bottom-sheet-closed");
    }
  }

  connectedCallback() {
    super.connectedCallback();

    // register event listeners for drag handling
    document.addEventListener("mousemove", this._handleMouseMove);
    document.addEventListener("mouseup", this._handleMouseUp);
    document.addEventListener("touchmove", this._handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._handleTouchEnd);
    document.addEventListener("touchcancel", this._handleTouchEnd);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // unregister event listeners for drag handling
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
    this._initialSize = (this._dialog.offsetHeight / window.innerHeight) * 100;
    document.body.style.setProperty("cursor", "grabbing");
  }

  private _handleMouseMove = (ev: MouseEvent) => {
    if (!this._dragging) {
      return;
    }
    this._updateSize(ev.clientY);
  };

  private _handleTouchMove = (ev: TouchEvent) => {
    if (!this._dragging) {
      return;
    }
    ev.preventDefault(); // Prevent scrolling
    this._updateSize(ev.touches[0].clientY);
  };

  private _updateSize(clientY: number) {
    const deltaY = this._dragStartY - clientY;
    const viewportHeight = window.innerHeight;
    const deltaVh = (deltaY / viewportHeight) * 100;

    // Calculate new size and clamp between 10vh and 90vh
    let newSize = this._initialSize + deltaVh;
    newSize = Math.max(10, Math.min(MAX_VIEWPOINT_HEIGHT, newSize));

    // on drag down and below 20vh
    if (newSize < MIN_VIEWPOINT_HEIGHT && deltaY < 0) {
      this._endDrag();
      this.closeSheet();
      return;
    }

    this._dialogViewportHeight = newSize;
  }

  private _handleMouseUp = () => {
    this._endDrag();
  };

  private _handleTouchEnd = () => {
    this._endDrag();
  };

  private _endDrag() {
    if (!this._dragging) {
      return;
    }
    this._dragging = false;
    document.body.style.removeProperty("cursor");
  }

  static styles = css`
    .handle-wrapper {
      position: absolute;
      top: 0;
      width: 100%;
      padding-bottom: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: grab;
      touch-action: none;
    }
    .handle-wrapper .handle {
      height: 20px;
      width: 200px;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 7;
      padding-bottom: 76px;
    }
    .handle-wrapper .handle::after {
      content: "";
      border-radius: 8px;
      height: 4px;
      background: var(--divider-color, #e0e0e0);
      width: 80px;
    }
    .handle-wrapper .handle:active::after {
      cursor: grabbing;
    }
    dialog {
      height: auto;
      max-height: 70vh;
      min-height: 30vh;
      background-color: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      display: flex;
      flex-direction: column;
      top: 0;
      inset-inline-start: 0;
      position: fixed;
      width: calc(
        100% - 4px - var(--safe-area-inset-left) - var(--safe-area-inset-right)
      );
      max-width: 100%;
      border: none;
      box-shadow: var(--wa-shadow-l);
      padding: 0;
      margin: 0;
      top: auto;
      inset-inline-end: auto;
      bottom: 0;
      inset-inline-start: 0;
      box-shadow: 0px -8px 16px rgba(0, 0, 0, 0.2);
      border-top-left-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-top-right-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      transform: translateY(100%);
      transition: transform ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms ease;
      border-top-width: var(--ha-bottom-sheet-border-width);
      border-right-width: var(--ha-bottom-sheet-border-width);
      border-left-width: var(--ha-bottom-sheet-border-width);
      border-bottom-width: 0;
      border-style: var(--ha-bottom-sheet-border-style);
      border-color: var(--ha-bottom-sheet-border-color);
      margin-bottom: var(--safe-area-inset-bottom);
      margin-left: var(--safe-area-inset-left);
      margin-right: var(--safe-area-inset-right);
    }

    dialog.show {
      transform: translateY(0);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-resizable-bottom-sheet": HaResizableBottomSheet;
  }

  interface HASSDomEvents {
    "bottom-sheet-closed": undefined;
  }
}

import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { BOTTOM_SHEET_ANIMATION_DURATION_MS } from "./ha-bottom-sheet";

/**
 * A bottom sheet component that slides up from the bottom of the screen.
 *
 * The bottom sheet provides a draggable interface that allows users to resize
 * the sheet by dragging the handle at the top. It supports both mouse and touch
 * interactions and automatically closes when dragged below a 20% of screen height.
 *
 * A persistent sheet never closes by dragging; it stops at its minimum height
 * instead, so a host can keep a collapsed strip of content reachable.
 *
 * @fires bottom-sheet-closed - Fired when the bottom sheet is closed
 * @fires bottom-sheet-resized - Fired with the sheet's height in pixels once
 * it has opened and whenever a drag ends
 *
 * @cssprop --ha-bottom-sheet-border-width - Border width for the sheet
 * @cssprop --ha-bottom-sheet-border-style - Border style for the sheet
 * @cssprop --ha-bottom-sheet-border-color - Border color for the sheet
 * @cssprop --ha-bottom-sheet-handle-padding - How far below the handle the
 * grab area reaches; shrink it when content sits right under the handle
 */
@customElement("ha-resizable-bottom-sheet")
export class HaResizableBottomSheet extends LitElement {
  @query("dialog") private _dialog!: HTMLDialogElement;

  /** Dragging down stops at the minimum height instead of closing the sheet */
  @property({ type: Boolean }) public persistent = false;

  /**
   * The height in pixels the sheet cannot be dragged below, e.g. what a host
   * measures for the strip it wants to keep visible. Without it the sheet
   * stops at 20% of the viewport.
   */
  @property({ type: Number, attribute: "min-height" })
  public minHeight?: number;

  /**
   * The largest share of the viewport the sheet opens at, in percent. It
   * opens at its content height up to this, and can be dragged to 90 after.
   */
  @property({ type: Number, attribute: "open-max-viewport-height" })
  public openMaxViewportHeight = 70;

  /**
   * Whether the sheet may open smaller than 55% of the viewport, down to its
   * content height and the minimum it can be dragged to.
   */
  @property({ type: Boolean, attribute: "open-at-content-height" })
  public openAtContentHeight = false;

  private _dragging = false;

  private _dragStartY = 0;

  private _initialSize = 0;

  private _opened = false;

  @state() private _dialogMaxViewpointHeight?: number;

  @state() private _dialogMinViewpointHeight?: number;

  @state() private _dialogViewportHeight?: number;

  render() {
    // Until it has opened, the sheet sizes to its content within the opening
    // bounds; afterwards it keeps the height it settled on or was dragged to
    const maxHeight =
      this._dialogMaxViewpointHeight ?? this.openMaxViewportHeight;
    const minHeight =
      this._dialogMinViewpointHeight ??
      (this.openAtContentHeight ? this._minViewportHeight() : 55);
    return html`<dialog
      open
      @transitionend=${this._handleTransitionEnd}
      style=${`
        --height: ${this._dialogViewportHeight}vh;
        --height: ${this._dialogViewportHeight}dvh;
        --max-height: ${maxHeight}vh;
        --max-height: ${maxHeight}dvh;
        --min-height: ${minHeight}vh;
        --min-height: ${minHeight}dvh;
      `}
    >
      <div class="handle-wrapper">
        <div
          @mousedown=${this._handleMouseDown}
          @touchstart=${this._handleTouchStart}
          class="handle"
        ></div>
      </div>
      <slot></slot>
    </dialog>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
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
      this._dialogMaxViewpointHeight = 90;
      this._dialogMinViewpointHeight = this._minViewportHeight();
      this._opened = true;
      this._fireResized();
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
    newSize = Math.max(10, Math.min(90, newSize));

    if (this.persistent) {
      newSize = Math.max(this._minViewportHeight(), newSize);
    } else if (newSize < 20 && deltaY < 0) {
      // on drag down and below 20vh
      this._endDrag();
      this.closeSheet();
      return;
    }

    this._dialogViewportHeight = newSize;
  }

  private _minViewportHeight(): number {
    return this.minHeight === undefined
      ? 20
      : (this.minHeight / window.innerHeight) * 100;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    // A minimum set after opening applies right away
    if (changedProperties.has("minHeight") && this._opened) {
      this._dialogMinViewpointHeight = this._minViewportHeight();
    }
  }

  private _fireResized() {
    fireEvent(this, "bottom-sheet-resized", {
      height: this._dialog.offsetHeight,
    });
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
    // Hosts lay out around the sheet once, not on every move
    this.updateComplete.then(() => this._fireResized());
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
      /* Extends the grab area over the content below the handle */
      padding-bottom: var(--ha-bottom-sheet-handle-padding, 76px);
    }
    .handle-wrapper .handle::after {
      content: "";
      border-radius: var(--ha-border-radius-md);
      height: 4px;
      background: var(--divider-color, #e0e0e0);
      width: 80px;
    }
    .handle-wrapper .handle:active::after {
      cursor: grabbing;
    }
    dialog {
      height: var(--height, auto);
      max-height: min(
        var(--max-height, 70vh),
        calc(100vh - var(--safe-area-inset-top))
      );
      max-height: min(
        var(--max-height, 70dvh),
        calc(100dvh - var(--safe-area-inset-top))
      );
      min-height: var(--min-height, 30vh);
      min-height: var(--min-height, 30dvh);
      background-color: var(
        --ha-bottom-sheet-surface-background,
        var(--ha-color-surface-default)
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
        --ha-bottom-sheet-border-radius,
        var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
      );
      border-top-right-radius: var(
        --ha-bottom-sheet-border-radius,
        var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
      );
      transform: translateY(100%);
      transition: transform ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms ease;
      border-top-width: var(--ha-bottom-sheet-border-width);
      border-right-width: var(--ha-bottom-sheet-border-width);
      border-left-width: var(--ha-bottom-sheet-border-width);
      border-bottom-width: 0;
      border-style: var(--ha-bottom-sheet-border-style);
      border-color: var(--ha-bottom-sheet-border-color);
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
    "bottom-sheet-resized": { height: number };
  }
}

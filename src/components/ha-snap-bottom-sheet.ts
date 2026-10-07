import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { isSwipeLocked } from "../common/dom/is-swipe-locked";
import { popoverSupported } from "../common/feature-detect/support-popover";
import { SwipeGestureRecognizer } from "../common/util/swipe-gesture-recognizer";

export type BottomSheetPosition = "collapsed" | "half" | "full";

const HALF_VIEWPORT_SHARE = 0.5;

// How far a touch moves before its direction decides what it drags
const TOUCH_SLOP_PX = 4;

interface Stop {
  position: BottomSheetPosition;
  height: number;
}

/**
 * A bottom sheet that slides up from the bottom of the screen without blocking
 * the page behind it. It sits in the top layer, above the toolbar, like other
 * sheets; a backdrop fades in as it rises from half to full height, and a tap
 * on it brings the sheet back to half.
 *
 * It rests collapsed, at half or at full height and snaps to the nearest of
 * them when a drag ends, or to the next one in the direction of a quick swipe.
 * The handle drags with a mouse or a finger. On touch the whole sheet drags
 * too, until it is at full height: then its content scrolls, and pulling down
 * from the top brings the sheet down again. Dragging down never closes it; it
 * collapses to `minHeight` so a host keeps a strip of content reachable, and
 * only `closeSheet` closes it.
 *
 * @fires bottom-sheet-closed - Fired when the bottom sheet is closed
 * @fires bottom-sheet-resized - Fired with the sheet's height in pixels
 * whenever it settles at a new height, or when `halfHeight` changes
 *
 * @cssprop --ha-bottom-sheet-handle-padding - How far below the handle the
 * grab area reaches; shrink it when content sits right under the handle
 */
@customElement("ha-snap-bottom-sheet")
export class HaSnapBottomSheet extends LitElement {
  @query(".sheet") private _sheet!: HTMLElement;

  @query(".backdrop") private _backdrop!: HTMLElement;

  @query(".handle") private _handle!: HTMLElement;

  /**
   * The height in pixels of the strip the collapsed sheet keeps visible, e.g.
   * what a host measures; the sheet adds the bottom safe area below it.
   * Without it the sheet does not collapse.
   */
  @property({ type: Number, attribute: "min-height" })
  public minHeight?: number;

  /** Names the sheet for assistive technologies */
  @property() public label?: string;

  @state() private _shown = false;

  @state() private _position: BottomSheetPosition = "half";

  @state() private _dragHeight?: number;

  private _gesture = new SwipeGestureRecognizer();

  private _dragging = false;

  private _dragStartHeight = 0;

  // A touch on the content that has not moved yet, so it is unknown whether
  // it drags the sheet, scrolls the content or is a tap
  private _pendingTouch?: { x: number; y: number };

  private _reported?: { height: number; halfHeight: number };

  private _closing = false;

  public get position(): BottomSheetPosition {
    return this._position;
  }

  public get halfHeight(): number {
    return window.innerHeight * HALF_VIEWPORT_SHARE;
  }

  public snapTo(position: BottomSheetPosition) {
    this._position = position;
  }

  public async closeSheet() {
    if (this._closing) {
      return;
    }
    this._closing = true;
    this._shown = false;
    await this._transitionsDone();
    if (popoverSupported) {
      this._sheet.hidePopover();
      this._backdrop.hidePopover();
    }
    fireEvent(this, "bottom-sheet-closed");
  }

  render() {
    const full = this._position === "full";
    const dragging = this._dragHeight !== undefined;
    const popover = ifDefined(popoverSupported ? "manual" : undefined);
    return html`<div
        class="backdrop ${classMap({ active: this._shown && full, dragging })}"
        popover=${popover}
        style=${styleMap({ opacity: String(this._backdropOpacity()) })}
        @click=${this._handleBackdropClick}
      ></div>
      <div
        class="sheet ${classMap({ show: this._shown, full, dragging })}"
        popover=${popover}
        role="region"
        aria-label=${ifDefined(this.label)}
        style=${styleMap({
          height: this._height(),
          "min-height": this._collapsedHeight(),
        })}
        @touchstart=${this._handleTouchStart}
      >
        <div class="handle-wrapper">
          <div @mousedown=${this._handleMouseDown} class="handle"></div>
        </div>
        <slot></slot>
      </div>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    this._showPopovers();
    requestAnimationFrame(() => {
      if (!this._closing) {
        this._shown = true;
      }
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (
      changedProperties.has("_position") ||
      changedProperties.has("minHeight") ||
      (changedProperties.has("_dragHeight") && this._dragHeight === undefined)
    ) {
      this._reportWhenSettled();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Leaving the page, e.g. with a cached dashboard view, took the sheet out
    // of the top layer, and the host may have dropped its height meanwhile
    if (this.hasUpdated && this._shown) {
      this._showPopovers();
      this._reported = undefined;
      this._reportWhenSettled();
    }
    document.addEventListener("mousemove", this._handleMouseMove);
    document.addEventListener("mouseup", this._handleMouseUp);
    document.addEventListener("touchmove", this._handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._handleTouchEnd);
    document.addEventListener("touchcancel", this._handleTouchEnd);
    window.addEventListener("resize", this._handleViewportResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._dragging) {
      document.body.style.removeProperty("cursor");
    }
    this._dragging = false;
    this._pendingTouch = undefined;
    this._dragHeight = undefined;
    document.removeEventListener("mousemove", this._handleMouseMove);
    document.removeEventListener("mouseup", this._handleMouseUp);
    document.removeEventListener("touchmove", this._handleTouchMove);
    document.removeEventListener("touchend", this._handleTouchEnd);
    document.removeEventListener("touchcancel", this._handleTouchEnd);
    window.removeEventListener("resize", this._handleViewportResize);
  }

  private _collapsedHeight(): string | undefined {
    return this.minHeight === undefined
      ? undefined
      : `calc(${this.minHeight}px + var(--safe-area-inset-bottom, 0px))`;
  }

  private _height(): string | undefined {
    if (this._dragHeight !== undefined) {
      return `${this._dragHeight}px`;
    }
    return this._position === "collapsed" ? this._collapsedHeight() : undefined;
  }

  private _showPopovers() {
    if (!popoverSupported) {
      return;
    }
    // Shown first so the sheet stacks above it
    for (const element of [this._backdrop, this._sheet]) {
      if (!element.matches(":popover-open")) {
        element.showPopover();
      }
    }
  }

  private _backdropOpacity(): number {
    if (!this._shown) {
      return 0;
    }
    if (this._dragHeight === undefined) {
      return this._position === "full" ? 1 : 0;
    }
    const half = this.halfHeight;
    const progress = (this._dragHeight - half) / (this._fullHeight() - half);
    return Math.min(1, Math.max(0, progress));
  }

  private _handleBackdropClick = () => {
    this._position = "half";
  };

  // The half and full heights follow the viewport, for example on rotation
  private _handleViewportResize = () => {
    this._reportWhenSettled();
  };

  private _handleMouseDown = (ev: MouseEvent) => {
    document.body.style.setProperty("cursor", "grabbing");
    this._startDrag(ev.clientY);
  };

  private _handleMouseMove = (ev: MouseEvent) => {
    if (this._dragging) {
      this._moveDrag(ev.clientY);
    }
  };

  private _handleMouseUp = () => {
    this._endDrag();
  };

  private _handleTouchStart = (ev: TouchEvent) => {
    if (ev.touches.length !== 1) {
      return;
    }
    const touch = ev.touches[0];
    const path = ev.composedPath();
    if (path.includes(this._handle)) {
      // Prevent the browser from interpreting this as a scroll/PTR gesture.
      ev.preventDefault();
      this._startDrag(touch.clientY);
      return;
    }
    const content = path.slice(0, path.indexOf(this._sheet));
    // Dialogs and menus opened inside the content handle their own swipes
    if (
      content.some(
        (target) =>
          target instanceof HTMLDialogElement ||
          (popoverSupported &&
            target instanceof HTMLElement &&
            target.matches(":popover-open"))
      ) ||
      isSwipeLocked(content, this._sheet)
    ) {
      return;
    }
    this._pendingTouch = { x: touch.clientX, y: touch.clientY };
  };

  private _handleTouchMove = (ev: TouchEvent) => {
    const touch = ev.touches[0];
    if (this._pendingTouch) {
      const start = this._pendingTouch;
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (ev.cancelable && Math.hypot(deltaX, deltaY) < TOUCH_SLOP_PX) {
        return;
      }
      this._pendingTouch = undefined;
      // Sideways moves and scrolls the browser already started stay with the
      // content, and so does scrolling up once the sheet is at full height
      if (
        !ev.cancelable ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        (deltaY < 0 && this._position === "full")
      ) {
        return;
      }
      this._startDrag(start.y);
    }
    if (!this._dragging) {
      return;
    }
    ev.preventDefault();
    this._moveDrag(touch.clientY);
  };

  private _handleTouchEnd = () => {
    this._pendingTouch = undefined;
    this._endDrag();
  };

  private _startDrag(clientY: number) {
    this._dragging = true;
    this._dragStartHeight = this._sheet.offsetHeight;
    this._gesture.start(clientY);
  }

  private _moveDrag(clientY: number) {
    const delta = this._gesture.move(clientY);
    this._dragHeight = Math.max(
      this._stops()[0].height,
      this._dragStartHeight + delta
    );
  }

  private _endDrag() {
    if (!this._dragging) {
      return;
    }
    this._dragging = false;
    document.body.style.removeProperty("cursor");
    const { isSwipe, isDownwardSwipe } = this._gesture.end();
    this._position = this._stopAfterDrag(
      this._sheet.offsetHeight,
      isSwipe ? (isDownwardSwipe ? "down" : "up") : undefined
    );
    this._dragHeight = undefined;
  }

  // A swipe goes on to the next stop in its direction, a slow drag settles on
  // the nearest one
  private _stopAfterDrag(
    height: number,
    direction?: "up" | "down"
  ): BottomSheetPosition {
    const stops = this._stops();
    if (direction === "up") {
      return (
        stops.find((stop) => stop.height > height) ?? stops[stops.length - 1]
      ).position;
    }
    if (direction === "down") {
      return (
        [...stops].reverse().find((stop) => stop.height < height) ?? stops[0]
      ).position;
    }
    return stops.reduce((nearest, stop) =>
      Math.abs(stop.height - height) < Math.abs(nearest.height - height)
        ? stop
        : nearest
    ).position;
  }

  private _stops(): Stop[] {
    const stops: Stop[] = [];
    if (this.minHeight !== undefined) {
      stops.push({
        position: "collapsed",
        height: parseFloat(getComputedStyle(this._sheet).minHeight),
      });
    }
    stops.push(
      { position: "half", height: this.halfHeight },
      { position: "full", height: this._fullHeight() }
    );
    return stops;
  }

  private _fullHeight(): number {
    return parseFloat(getComputedStyle(this._sheet).maxHeight);
  }

  private async _transitionsDone(): Promise<boolean> {
    await this.updateComplete;
    try {
      await Promise.all(
        this._sheet.getAnimations().map((animation) => animation.finished)
      );
      return true;
    } catch {
      // A newer change interrupted the transition and settles on its own
      return false;
    }
  }

  // Hosts lay out around the sheet once it settles, not on every frame
  private async _reportWhenSettled() {
    if (!(await this._transitionsDone()) || this._dragging) {
      return;
    }
    const height = this._sheet.offsetHeight;
    const halfHeight = this.halfHeight;
    if (
      height === this._reported?.height &&
      halfHeight === this._reported.halfHeight
    ) {
      return;
    }
    this._reported = { height, halfHeight };
    fireEvent(this, "bottom-sheet-resized", { height });
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
      background: var(--ha-bottom-sheet-handle-color, var(--divider-color));
      width: 40px;
    }
    .handle-wrapper .handle:active::after {
      cursor: grabbing;
    }
    .sheet {
      height: 50vh;
      height: 50dvh;
      max-height: calc(100vh - max(var(--safe-area-inset-top, 0px), 48px));
      max-height: calc(100dvh - max(var(--safe-area-inset-top, 0px), 48px));
      background-color: var(
        --ha-bottom-sheet-surface-background,
        var(
          --ha-dialog-surface-background,
          var(--card-background-color, var(--ha-color-surface-default))
        )
      );
      backdrop-filter: var(
        --ha-bottom-sheet-surface-backdrop-filter,
        var(--ha-dialog-surface-backdrop-filter, none)
      );
      display: flex;
      flex-direction: column;
      top: 0;
      inset-inline-start: 0;
      position: fixed;
      --sheet-inset-left: var(
        --ha-bottom-sheet-inset-left,
        var(--safe-area-inset-left)
      );
      --sheet-inset-right: var(
        --ha-bottom-sheet-inset-right,
        var(--safe-area-inset-right)
      );
      width: calc(100% - var(--sheet-inset-left) - var(--sheet-inset-right));
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
      transition:
        transform var(--ha-animation-duration-normal) ease,
        height var(--ha-animation-duration-normal) ease;
      margin-left: var(--sheet-inset-left);
      margin-right: var(--sheet-inset-right);
      outline: none;
      overflow: visible;
      color: inherit;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      width: auto;
      height: auto;
      margin: 0;
      padding: 0;
      border: none;
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
        var(--mdc-dialog-scrim-color, transparent)
      );
      pointer-events: none;
      transition: opacity var(--ha-animation-duration-normal) ease;
    }

    .backdrop.active {
      pointer-events: auto;
    }

    .backdrop.dragging {
      transition: none;
    }

    .sheet.full {
      height: calc(100vh - max(var(--safe-area-inset-top, 0px), 48px));
      height: calc(100dvh - max(var(--safe-area-inset-top, 0px), 48px));
    }

    .sheet.dragging {
      transition: transform var(--ha-animation-duration-normal) ease;
    }

    .sheet.show {
      transform: translateY(0);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-snap-bottom-sheet": HaSnapBottomSheet;
  }

  interface HASSDomEvents {
    "bottom-sheet-closed": undefined;
    "bottom-sheet-resized": { height: number };
  }
}

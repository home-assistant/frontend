import { mdiDragVerticalVariant } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { preventDefault } from "../../common/dom/prevent_default";
import { formatNumber } from "../../common/number/format_number";
import { internationalizationContext } from "../../data/context";
import type { HomeAssistantInternationalization } from "../../types";
import "../ha-svg-icon";

// Shaped like ha-switch: a track, and the visible range as a pill with a drag
// handle at each end
export const ZOOM_SLIDER_HEIGHT = 24;
const THUMB_SIZE = 20;
const THUMB_INSET = (ZOOM_SLIDER_HEIGHT - THUMB_SIZE) / 2;
// Leaves room to grab the range between its thumbs, however small it gets
const RANGE_MIN_WIDTH = 2 * (THUMB_INSET + THUMB_SIZE) + ZOOM_SLIDER_HEIGHT;
// The smallest visible range the thumbs can be dragged to, in percent
const MIN_RANGE = 1;
// A press this soon after a tap's release shows the full range again
const DOUBLE_PRESS_TIME = 300;
// A press that moves further than this is a drag, not a tap
const TAP_MAX_DISTANCE = 4;

type SliderPart = "start" | "end" | "range";

@customElement("ha-chart-zoom-slider")
export class HaChartZoomSlider extends LitElement {
  @property({ type: Number }) public start = 0;

  @property({ type: Number }) public end = 100;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  private _pressX?: number;

  private _lastTapTime?: number;

  private _drag?: {
    pointerId: number;
    part: SliderPart;
    x: number;
    range: [number, number];
  };

  protected render() {
    const { start, end } = this;
    const { localize, locale } = this._i18n;
    const at = (percent: number) =>
      `calc((100% - ${RANGE_MIN_WIDTH}px) * ${percent / 100})`;
    const percent = (value: number) =>
      formatNumber(value / 100, locale, {
        style: "percent",
        maximumFractionDigits: 1,
      });
    return html`
      <div
        class="track"
        @pointerdown=${this._handleTrackPointerDown}
        @pointerup=${this._handleTrackPointerUp}
        @pointercancel=${this._handleTrackPointerUp}
        @selectstart=${preventDefault}
      >
        <div
          class="range"
          data-part="range"
          role="slider"
          aria-orientation="horizontal"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${Math.round(start)}
          aria-valuetext=${`${percent(start)} – ${percent(end)}`}
          aria-label=${localize("ui.components.history_charts.zoom_range")}
          tabindex="0"
          style=${styleMap({
            left: at(start),
            width: `calc(${at(end - start)} + ${RANGE_MIN_WIDTH}px)`,
          })}
          @pointerdown=${this._handlePointerDown}
          @pointermove=${this._handlePointerMove}
          @pointerup=${this._handlePointerUp}
          @pointercancel=${this._handlePointerUp}
          @keydown=${this._handleKeyDown}
        ></div>
        ${(["start", "end"] as const).map(
          (part) =>
            html`<div
              class="thumb"
              data-part=${part}
              role="slider"
              aria-orientation="horizontal"
              aria-valuemin=${
                part === "start"
                  ? 0
                  : Math.round(Math.min(start + MIN_RANGE, end))
              }
              aria-valuemax=${
                part === "start"
                  ? Math.round(Math.max(end - MIN_RANGE, start))
                  : 100
              }
              aria-valuenow=${Math.round(part === "start" ? start : end)}
              aria-valuetext=${percent(part === "start" ? start : end)}
              aria-label=${localize(`ui.components.history_charts.zoom_${part}`)}
              tabindex="0"
              style=${styleMap({
                left:
                  part === "start"
                    ? `calc(${at(start)} + ${THUMB_INSET}px)`
                    : `calc(${at(end)} + ${RANGE_MIN_WIDTH - THUMB_INSET - THUMB_SIZE}px)`,
              })}
              @pointerdown=${this._handlePointerDown}
              @pointermove=${this._handlePointerMove}
              @pointerup=${this._handlePointerUp}
              @pointercancel=${this._handlePointerUp}
              @keydown=${this._handleKeyDown}
            >
              <ha-svg-icon .path=${mdiDragVerticalVariant}></ha-svg-icon>
            </div>`
        )}
      </div>
    `;
  }

  // Percent of the full range per pixel along the track
  private _getScale() {
    return 100 / Math.max(this.clientWidth - RANGE_MIN_WIDTH, 1);
  }

  // Pressing the track beside the visible range centers the range there.
  // Double tapping anywhere on the slider resets it to the full range; this
  // times taps itself, as touch browsers do not reliably fire dblclick.
  private _handleTrackPointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    if (ev.button !== 0 || !ev.isPrimary) {
      return;
    }
    if (
      this._lastTapTime !== undefined &&
      ev.timeStamp - this._lastTapTime < DOUBLE_PRESS_TIME
    ) {
      this._lastTapTime = undefined;
      this._pressX = undefined;
      this._drag = undefined;
      // The press ends here, so the chart does not keep holding the slider open
      ev.stopPropagation();
      fireEvent(this, "zoom-slider-reset");
      return;
    }
    this._pressX = ev.clientX;
    if (ev.target !== ev.currentTarget) {
      return;
    }
    const position = (ev.offsetX - RANGE_MIN_WIDTH / 2) * this._getScale();
    this._move(
      "range",
      [this.start, this.end],
      position - (this.start + this.end) / 2
    );
  }

  // Only a press released where it started counts as a tap, so a quick drag
  // followed by another press does not reset the zoom
  private _handleTrackPointerUp(ev: PointerEvent) {
    if (!ev.isPrimary) {
      return;
    }
    const tapped =
      ev.type === "pointerup" &&
      this._pressX !== undefined &&
      Math.abs(ev.clientX - this._pressX) <= TAP_MAX_DISTANCE;
    this._lastTapTime = tapped ? ev.timeStamp : undefined;
    this._pressX = undefined;
  }

  private _handlePointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    if (ev.button !== 0 || !ev.isPrimary) {
      return;
    }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    this._drag = {
      pointerId: ev.pointerId,
      part: ev.currentTarget.dataset.part as SliderPart,
      x: ev.clientX,
      range: [this.start, this.end],
    };
  }

  private _handlePointerMove(ev: PointerEvent) {
    if (ev.pointerId !== this._drag?.pointerId) {
      return;
    }
    // The release can be missed, so a move without a pressed button ends it
    if (!ev.buttons) {
      this._drag = undefined;
      return;
    }
    const { part, x, range } = this._drag;
    this._move(part, range, (ev.clientX - x) * this._getScale());
  }

  private _handlePointerUp(ev: PointerEvent) {
    if (ev.pointerId === this._drag?.pointerId) {
      this._drag = undefined;
    }
  }

  private _handleKeyDown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    const part = ev.currentTarget.dataset.part as SliderPart;
    const span = this.end - this.start;
    const decrease = ev.key === "ArrowLeft" || ev.key === "ArrowDown";
    // A ninth of a shrunk span undoes a tenth of the original one
    const step =
      part !== "range" && (part === "start") === decrease
        ? span / 9
        : span / 10;
    const shift = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      Home: -100,
      End: 100,
    }[ev.key];
    if (shift === undefined) {
      return;
    }
    ev.preventDefault();
    this._move(part, [this.start, this.end], shift);
  }

  // Moves the whole range, or one end of it, by a percentage of the full range
  private _move(
    part: SliderPart,
    [start, end]: [number, number],
    shift: number
  ) {
    let newStart = start;
    let newEnd = end;
    if (part === "range") {
      const clamped = Math.max(-start, Math.min(100 - end, shift));
      newStart += clamped;
      newEnd += clamped;
    } else if (part === "start") {
      newStart = Math.min(
        Math.max(start + shift, 0),
        Math.max(end - MIN_RANGE, start)
      );
    } else {
      newEnd = Math.max(
        Math.min(end + shift, 100),
        Math.min(start + MIN_RANGE, end)
      );
    }
    if (newStart === this.start && newEnd === this.end) {
      return;
    }
    fireEvent(this, "zoom-slider-changed", { start: newStart, end: newEnd });
  }

  static styles = css`
    :host {
      display: block;
      height: ${ZOOM_SLIDER_HEIGHT}px;
    }
    .track {
      position: relative;
      height: 100%;
      border-radius: var(--ha-border-radius-pill);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      touch-action: none;
      cursor: pointer;
    }
    .range {
      position: absolute;
      top: 0;
      bottom: 0;
      border-radius: var(--ha-border-radius-pill);
      /* The ha-switch thumb color, which stands out in both themes */
      background-color: var(--ha-color-on-neutral-normal);
      cursor: grab;
    }
    .track,
    .range {
      transition: background-color var(--ha-animation-duration-fast) ease-in-out;
    }
    @media (hover: hover) {
      .track:hover {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
      }
      .range:hover,
      .track:has(.thumb:hover) .range {
        background-color: var(--ha-color-on-neutral-quiet);
      }
    }
    .range:active {
      cursor: grabbing;
      background-color: var(--ha-color-on-neutral-normal);
    }
    .thumb {
      position: absolute;
      top: ${THUMB_INSET}px;
      display: flex;
      width: ${THUMB_SIZE}px;
      height: ${THUMB_SIZE}px;
      border-radius: var(--ha-border-radius-sm);
      color: var(--ha-color-on-neutral-loud);
      --mdc-icon-size: ${THUMB_SIZE}px;
      cursor: ew-resize;
    }
    .range:focus-visible,
    .thumb:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "zoom-slider-changed": { start: number; end: number };
    "zoom-slider-reset": undefined;
  }
  interface HTMLElementTagNameMap {
    "ha-chart-zoom-slider": HaChartZoomSlider;
  }
}

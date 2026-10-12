import { mdiDragVerticalVariant } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../common/decorators/consume";
import { fireEvent } from "../../common/dom/fire_event";
import { internationalizationContext } from "../../data/context";
import type { HomeAssistantInternationalization } from "../../types";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";

// The slider takes the shape of ha-switch: a track, and the visible range as a
// pill with a drag handle at each end.
export const ZOOM_SLIDER_HEIGHT = 32;
const THUMB_SIZE = 24;
const THUMB_INSET = (ZOOM_SLIDER_HEIGHT - THUMB_SIZE) / 2;
// The smallest visible range the thumbs can be dragged to, in percent.
const MIN_RANGE = 1;

type SliderPart = "start" | "end" | "range";

declare global {
  interface HASSDomEvents {
    "zoom-slider-changed": { start: number; end: number };
  }
}

/**
 * A horizontal zoom window over a chart's full range, in percent. Drag the
 * range to pan, drag its ends to resize, or press the track to centre the
 * range there.
 */
// ponytail: assumes an x-axis that runs left to right; no chart inverts it.
@customElement("ha-chart-zoom-slider")
export class HaChartZoomSlider extends LitElement {
  @property({ type: Number }) public start = 0;

  @property({ type: Number }) public end = 100;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  private _drag?: { part: SliderPart; x: number; range: [number, number] };

  protected render() {
    const { start, end } = this;
    const localize = this._i18n?.localize;
    // Thumb centres run from one thumb radius in from each end of the track,
    // so the visible range pill always holds both thumbs, like ha-switch.
    const at = (percent: number) =>
      `calc((100% - ${ZOOM_SLIDER_HEIGHT}px) * ${percent / 100})`;
    return html`
      <div class="track" @pointerdown=${this._handleTrackPointerDown}>
        <div
          class="range"
          data-part="range"
          role="slider"
          aria-orientation="horizontal"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${Math.round(start)}
          aria-label=${
            localize?.("ui.components.history_charts.zoom_range") ?? ""
          }
          tabindex="0"
          style=${styleMap({
            left: at(start),
            width: `calc(${at(end - start)} + ${ZOOM_SLIDER_HEIGHT}px)`,
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
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow=${Math.round(part === "start" ? start : end)}
              aria-label=${
                localize?.(`ui.components.history_charts.zoom_${part}`) ?? ""
              }
              tabindex="0"
              style=${styleMap({
                left: `calc(${at(part === "start" ? start : end)} + ${THUMB_INSET}px)`,
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

  // Percent of the full range per pixel along the track.
  private _getScale() {
    return 100 / Math.max(this.clientWidth - ZOOM_SLIDER_HEIGHT, 1);
  }

  // Pressing the track beside the visible range centres the range there.
  private _handleTrackPointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    if (ev.button !== 0 || ev.target !== ev.currentTarget) {
      return;
    }
    const position = (ev.offsetX - ZOOM_SLIDER_HEIGHT / 2) * this._getScale();
    this._move(
      "range",
      [this.start, this.end],
      position - (this.start + this.end) / 2
    );
  }

  private _handlePointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    if (ev.button !== 0) {
      return;
    }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    this._drag = {
      part: ev.currentTarget.dataset.part as SliderPart,
      x: ev.clientX,
      range: [this.start, this.end],
    };
  }

  private _handlePointerMove(ev: PointerEvent) {
    if (!this._drag) {
      return;
    }
    const { part, x, range } = this._drag;
    this._move(part, range, (ev.clientX - x) * this._getScale());
  }

  private _handlePointerUp() {
    this._drag = undefined;
  }

  private _handleKeyDown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    const step = (this.end - this.start) / 10;
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
    this._move(
      ev.currentTarget.dataset.part as SliderPart,
      [this.start, this.end],
      shift
    );
  }

  // Moves the whole range, or one end of it, by a percentage of the full range.
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
      newStart = Math.min(Math.max(start + shift, 0), end - MIN_RANGE);
    } else {
      newEnd = Math.max(Math.min(end + shift, 100), start + MIN_RANGE);
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
      background-color: var(--ha-color-fill-neutral-normal-resting);
      cursor: grab;
    }
    .range:active {
      cursor: grabbing;
    }
    /* The drag handle icon used across the frontend, turned upright. */
    .thumb {
      position: absolute;
      top: ${THUMB_INSET}px;
      display: flex;
      width: ${THUMB_SIZE}px;
      height: ${THUMB_SIZE}px;
      border-radius: var(--ha-border-radius-sm);
      color: var(--ha-color-on-neutral-normal);
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
  interface HTMLElementTagNameMap {
    "ha-chart-zoom-slider": HaChartZoomSlider;
  }
}

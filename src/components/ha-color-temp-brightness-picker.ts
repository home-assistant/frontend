import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import memoizeOne from "memoize-one";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { rgb2hex } from "../common/color/convert-color";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
  temperature2rgb,
} from "../common/color/convert-light-color";
import { fireEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { generateColorTemperatureGradient } from "../dialogs/more-info/components/lights/light-color-temp-picker";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Dark end of the vertical brightness gradient; not fully black so the
// temperature hue stays visible at the bottom of the pad
const PAD_DARK_COLOR = "rgb(26, 26, 26)";

// The marker color's luminance scales with brightness down to this floor,
// so the marker never renders fully black at minimum brightness
const MARKER_LUMINANCE_FLOOR = 0.2;

@customElement("ha-color-temp-brightness-picker")
export class HaColorTempBrightnessPicker extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  /** [color temperature in kelvin, brightness percentage] */
  @property({ attribute: false })
  public value?: [number, number];

  @property({ attribute: false })
  public minKelvin?: number;

  @property({ attribute: false })
  public maxKelvin?: number;

  @query("#pad") private _pad?: HTMLElement;

  private _mc?: HammerManager;

  @state()
  private _pressed?: string;

  // Normalized physical position on the pad, [0, 1] left-to-right/top-to-bottom
  @state()
  private _cursorPosition?: [number, number];

  @state()
  private _localValue?: [number, number];

  private get _minKelvin() {
    return this.minKelvin ?? DEFAULT_MIN_KELVIN;
  }

  private get _maxKelvin() {
    return this.maxKelvin ?? DEFAULT_MAX_KELVIN;
  }

  protected firstUpdated(changedProps: PropertyValues<this>): void {
    super.firstUpdated(changedProps);
    this._setupListeners();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyListeners();
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    const rangeChanged =
      changedProps.has("minKelvin") || changedProps.has("maxKelvin");
    if (
      rangeChanged ||
      (changedProps.has("value") &&
        (this._localValue?.[0] !== this.value?.[0] ||
          this._localValue?.[1] !== this.value?.[1]))
    ) {
      this._resetPosition();
    }
  }

  private _setupListeners() {
    if (this._pad && !this._mc) {
      this._mc = new Manager(this._pad);
      this._mc.add(
        new Pan({
          direction: DIRECTION_ALL,
          enable: true,
        })
      );

      this._mc.add(new Tap({ event: "singletap" }));

      let savedPosition;
      this._mc.on("panstart", (e) => {
        if (this.disabled) return;
        this._pressed = e.pointerType;
        savedPosition = this._cursorPosition;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this._pressed = undefined;
        this._cursorPosition = savedPosition;
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        this._cursorPosition = this._getPositionFromEvent(e);
        this._localValue = this._getValueFromCoord(...this._cursorPosition);
        fireEvent(this, "cursor-moved", { value: this._localValue });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this._pressed = undefined;
        this._cursorPosition = this._getPositionFromEvent(e);
        this._localValue = this._getValueFromCoord(...this._cursorPosition);
        fireEvent(this, "cursor-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this._localValue });
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        this._cursorPosition = this._getPositionFromEvent(e);
        this._localValue = this._getValueFromCoord(...this._cursorPosition);
        fireEvent(this, "value-changed", { value: this._localValue });
      });
    }
  }

  private _destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  private _resetPosition() {
    if (this.value === undefined) {
      this._cursorPosition = undefined;
      this._localValue = undefined;
      return;
    }
    this._cursorPosition = this._getCoordsFromValue(this.value);
    this._localValue = this.value;
  }

  private get _rtl() {
    return mainWindow.document.dir === "rtl";
  }

  private _getCoordsFromValue = (value: [number, number]): [number, number] => {
    const xValue =
      (clamp(value[0], this._minKelvin, this._maxKelvin) - this._minKelvin) /
      (this._maxKelvin - this._minKelvin);
    const x = this._rtl ? 1 - xValue : xValue;
    const y = 1 - clamp(value[1], 1, 100) / 100;
    return [x, y];
  };

  private _getValueFromCoord = (x: number, y: number): [number, number] => {
    const xValue = this._rtl ? 1 - x : x;
    const kelvin = Math.round(
      this._minKelvin + xValue * (this._maxKelvin - this._minKelvin)
    );
    const brightness = clamp(Math.round((1 - y) * 100), 1, 100);
    return [kelvin, brightness];
  };

  private _getPositionFromEvent = (e: HammerInput): [number, number] => {
    const boundingRect = this._pad!.getBoundingClientRect();
    const x = clamp(
      (e.center.x - boundingRect.left) / boundingRect.width,
      0,
      1
    );
    const y = clamp(
      (e.center.y - boundingRect.top) / boundingRect.height,
      0,
      1
    );
    return [x, y];
  };

  private _generateTemperatureGradient = memoizeOne(
    (min: number, max: number) => generateColorTemperatureGradient(min, max)
  );

  render() {
    const gradient = this._generateTemperatureGradient(
      this._minKelvin,
      this._maxKelvin
    );

    const [x, y] = this._cursorPosition ?? [0, 0];

    const markerScale = this._pressed
      ? this._pressed === "touch"
        ? "2.5"
        : "1.5"
      : "1";
    const markerOffset = this._pressed === "touch" ? "0px, -24px" : "0px, 0px";

    let markerColor = "#ffffff";
    if (this._localValue) {
      const rgb = temperature2rgb(this._localValue[0]);
      const factor =
        MARKER_LUMINANCE_FLOOR +
        (1 - MARKER_LUMINANCE_FLOOR) * (this._localValue[1] / 100);
      markerColor = rgb2hex([
        Math.round(rgb[0] * factor),
        Math.round(rgb[1] * factor),
        Math.round(rgb[2] * factor),
      ]);
    }

    return html`
      <div class="container ${classMap({ pressed: Boolean(this._pressed) })}">
        <div
          id="pad"
          style=${styleMap({
            "background-image": `linear-gradient(to top, ${PAD_DARK_COLOR}, white), linear-gradient(to ${this._rtl ? "left" : "right"}, ${gradient})`,
          })}
        ></div>
        <div
          class="cursor"
          style=${styleMap({
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            visibility: this._cursorPosition ? undefined : "hidden",
          })}
        >
          <div
            class="marker"
            style=${styleMap({
              "background-color": markerColor,
              transform: `translate(${markerOffset}) scale(${markerScale})`,
            })}
          ></div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      outline: none;
    }
    .container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
    }
    #pad {
      width: 100%;
      height: 100%;
      clip-path: inset(0 round var(--ha-border-radius-6xl));
      background-blend-mode: multiply;
      background-repeat: no-repeat;
      cursor: pointer;
      touch-action: none;
    }
    :host([disabled]) #pad {
      cursor: initial;
      filter: grayscale(1) opacity(0.5);
    }
    .cursor {
      position: absolute;
      width: 0;
      height: 0;
      pointer-events: none;
    }
    .marker {
      position: absolute;
      top: -16px;
      left: -16px;
      width: 32px;
      height: 32px;
      border-radius: var(--ha-border-radius-circle);
      border: 2px solid white;
      box-shadow:
        0 1px 4px rgba(0, 0, 0, 0.3),
        0 1px 6px rgba(0, 0, 0, 0.15);
    }
    .container:not(.pressed) .marker {
      transition:
        transform var(--ha-animation-duration-instant) ease-in-out,
        background-color var(--ha-animation-duration-instant) ease-in-out;
    }
    .container:not(.pressed) .cursor {
      transition:
        left var(--ha-animation-duration-fast) ease-in-out,
        top var(--ha-animation-duration-fast) ease-in-out;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-color-temp-brightness-picker": HaColorTempBrightnessPicker;
  }
}

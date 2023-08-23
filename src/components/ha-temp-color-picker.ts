import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import { LitElement, PropertyValues, css, html, svg } from "lit";
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

const SAFE_ZONE_FACTOR = 0.9;

declare global {
  interface HASSDomEvents {
    "cursor-moved": { value?: any };
  }
}

const A11Y_KEY_CODES = new Set([
  "ArrowRight",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

function xy2polar(x: number, y: number) {
  const r = Math.sqrt(x * x + y * y);
  const phi = Math.atan2(y, x);
  return [r, phi];
}

function polar2xy(r: number, phi: number) {
  const x = Math.cos(phi) * r;
  const y = Math.sin(phi) * r;
  return [x, y];
}

function drawColorWheel(
  ctx: CanvasRenderingContext2D,
  minTemp: number,
  maxTemp: number
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const radius = ctx.canvas.width / 2;

  const min = Math.max(minTemp, 2000);
  const max = Math.min(maxTemp, 40000);

  for (let y = -radius; y < radius; y += 1) {
    const x = radius * Math.sqrt(1 - (y / radius) ** 2);

    const fraction = (y / (radius * SAFE_ZONE_FACTOR) + 1) / 2;

    const temperature = Math.max(
      Math.min(min + fraction * (max - min), max),
      min
    );

    const color = rgb2hex(temperature2rgb(temperature));

    ctx.fillStyle = color;
    ctx.fillRect(radius - x, radius + y - 0.5, 2 * x, 2);
    ctx.fill();
  }
}

@customElement("ha-temp-color-picker")
class HaTempColorPicker extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Number, attribute: false })
  public renderSize?: number;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public min = DEFAULT_MIN_KELVIN;

  @property({ type: Number })
  public max = DEFAULT_MAX_KELVIN;

  @query("#canvas") private _canvas!: HTMLCanvasElement;

  private _mc?: HammerManager;

  @state()
  private _pressed?: string;

  @state()
  private _cursorPosition?: [number, number];

  @state()
  private _localValue?: number;

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._setupListeners();
    this._generateColorWheel();
    this.setAttribute("role", "slider");
    this.setAttribute("aria-orientation", "vertical");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
  }

  private _generateColorWheel() {
    const ctx = this._canvas.getContext("2d")!;
    drawColorWheel(ctx, this.min, this.max);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyListeners();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("_localValue")) {
      this.setAttribute("aria-valuenow", this._localValue?.toString() ?? "");
    }
    if (changedProps.has("min") || changedProps.has("max")) {
      this._generateColorWheel();
      this._resetPosition();
    }
    if (changedProps.has("min")) {
      this.setAttribute("aria-valuemin", this.min.toString());
    }
    if (changedProps.has("max")) {
      this.setAttribute("aria-valuemax", this.max.toString());
    }
    if (changedProps.has("value")) {
      if (this._localValue !== this.value) {
        this._resetPosition();
      }
    }
  }

  private _setupListeners() {
    if (this._canvas && !this._mc) {
      this._mc = new Manager(this._canvas);
      this._mc.add(
        new Pan({
          direction: DIRECTION_ALL,
          enable: true,
          threshold: 0,
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

      this.addEventListener("keydown", this._handleKeyDown);
      this.addEventListener("keyup", this._handleKeyUp);
    }
  }

  private _resetPosition() {
    if (this.value === undefined) {
      this._cursorPosition = undefined;
      this._localValue = undefined;
      return;
    }
    const [, y] = this._getCoordsFromValue(this.value);
    const currentX = this._cursorPosition?.[0] ?? 0;
    const x =
      Math.sign(currentX) * Math.min(Math.sqrt(1 - y ** 2), Math.abs(currentX));
    this._cursorPosition = [x, y];
    this._localValue = this.value;
  }

  private _getCoordsFromValue = (temperature: number): [number, number] => {
    if (this.value === this.min) {
      return [0, -1];
    }
    if (this.value === this.max) {
      return [0, 1];
    }
    const fraction = (temperature - this.min) / (this.max - this.min);
    const y = (2 * fraction - 1) * SAFE_ZONE_FACTOR;
    return [0, y];
  };

  private _getValueFromCoord = (_x: number, y: number): number => {
    const fraction = (y / SAFE_ZONE_FACTOR + 1) / 2;
    const temperature = Math.max(
      Math.min(this.min + fraction * (this.max - this.min), this.max),
      this.min
    );
    return Math.round(temperature);
  };

  private _getPositionFromEvent = (e: HammerInput): [number, number] => {
    const x = e.center.x;
    const y = e.center.y;
    const boundingRect = e.target.getBoundingClientRect();
    const offsetX = boundingRect.left;
    const offsetY = boundingRect.top;
    const maxX = e.target.clientWidth;
    const maxY = e.target.clientHeight;

    const _x = (2 * (x - offsetX)) / maxX - 1;
    const _y = (2 * (y - offsetY)) / maxY - 1;

    const [r, phi] = xy2polar(_x, _y);
    const [__x, __y] = polar2xy(Math.min(1, r), phi);
    return [__x, __y];
  };

  private _destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
    this.removeEventListener("keydown", this._handleKeyDown);
    this.removeEventListener("keyup", this._handleKeyDown);
  }

  _handleKeyDown(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();

    const step = 1;
    const tenPercentStep = Math.max(step, (this.max - this.min) / 10);
    const currentValue =
      this._localValue ?? Math.round((this.max + this.min) / 2);
    switch (e.code) {
      case "ArrowRight":
      case "ArrowUp":
        this._localValue = Math.round(Math.min(currentValue + step, this.max));
        break;
      case "ArrowLeft":
      case "ArrowDown":
        this._localValue = Math.round(Math.max(currentValue - step, this.min));
        break;
      case "PageUp":
        this._localValue = Math.round(
          Math.min(currentValue + tenPercentStep, this.max)
        );
        break;
      case "PageDown":
        this._localValue = Math.round(
          Math.max(currentValue - tenPercentStep, this.min)
        );
        break;
      case "Home":
        this._localValue = this.min;
        break;
      case "End":
        this._localValue = this.max;
        break;
    }
    if (this._localValue != null) {
      const [_, y] = this._getCoordsFromValue(this._localValue);
      const currentX = this._cursorPosition?.[0] ?? 0;
      const x =
        Math.sign(currentX) *
        Math.min(Math.sqrt(1 - y ** 2), Math.abs(currentX));
      this._cursorPosition = [x, y];
      fireEvent(this, "cursor-moved", { value: this._localValue });
    }
  }

  _handleKeyUp(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    this.value = this._localValue;
    fireEvent(this, "value-changed", { value: this._localValue });
  }

  render() {
    const size = this.renderSize || 400;
    const canvasSize = size * window.devicePixelRatio;

    const rgb = temperature2rgb(
      this._localValue ?? Math.round((this.max + this.min) / 2)
    );

    const [x, y] = this._cursorPosition ?? [0, 0];

    const cx = ((x + 1) * size) / 2;
    const cy = ((y + 1) * size) / 2;

    const markerPosition = `${cx}px, ${cy}px`;
    const markerScale = this._pressed
      ? this._pressed === "touch"
        ? "2.5"
        : "1.5"
      : "1";
    const markerOffset =
      this._pressed === "touch" ? `0px, -${size / 16}px` : "0px, 0px";

    return html`
      <div class="container ${classMap({ pressed: Boolean(this._pressed) })}">
        <canvas id="canvas" .width=${canvasSize} .height=${canvasSize}></canvas>
        <svg
          id="interaction"
          viewBox="0 0 ${size} ${size}"
          overflow="visible"
          aria-hidden="true"
        >
          <defs>${this.renderSVGFilter()}</defs>
          <g
            style=${styleMap({
              fill: rgb2hex(rgb),
              transform: `translate(${markerPosition})`,
            })}
            class="cursor"
          >
            <circle
              cx="0"
              cy="0"
              r="16"
              style=${styleMap({
                fill: rgb2hex(rgb),
                transform: `translate(${markerOffset}) scale(${markerScale})`,
                visibility: this._cursorPosition ? undefined : "hidden",
              })}
            ></circle>
          </g>
        </svg>
      </div>
    `;
  }

  renderSVGFilter() {
    return svg`
      <filter
        id="marker-shadow"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
        filterUnits="objectBoundingBox"
      >
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3" flood-color="rgba(0, 0, 0, 1)"/>
        <feDropShadow dx="0" dy="1" stdDeviation="3" flood-opacity="0.15" flood-color="rgba(0, 0, 0, 1)"/>
      </filter>
    `;
  }

  static get styles() {
    return css`
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
      canvas {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 50%;
        transition: box-shadow 180ms ease-in-out;
        cursor: pointer;
      }
      :host(:focus-visible) canvas {
        box-shadow: 0 0 0 2px rgb(255, 160, 0);
      }
      svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      circle {
        fill: black;
        stroke: white;
        stroke-width: 2;
        filter: url(#marker-shadow);
      }
      .container:not(.pressed) circle {
        transition:
          transform 100ms ease-in-out,
          fill 100ms ease-in-out;
      }
      .container:not(.pressed) .cursor {
        transition: transform 200ms ease-in-out;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-temp-color-picker": HaTempColorPicker;
  }
}

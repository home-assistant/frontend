import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import { css, html, LitElement, PropertyValues, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { rgb2hex } from "../common/color/convert-color";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "cursor-moved": { value?: any };
  }
}

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

function temperature2rgb(temperature: number): [number, number, number] {
  const value = temperature / 100;
  return [getRed(value), getGreen(value), getBlue(value)];
}

function getRed(temperature: number): number {
  if (temperature <= 66) {
    return 255;
  }
  const tmp_red = 329.698727446 * (temperature - 60) ** -0.1332047592;
  return clamp(tmp_red);
}

function getGreen(temperature: number): number {
  let green: number;
  if (temperature <= 66) {
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
  } else {
    green = 288.1221695283 * (temperature - 60) ** -0.0755148492;
  }
  return clamp(green);
}

function getBlue(temperature: number): number {
  if (temperature >= 66) {
    return 255;
  }
  if (temperature <= 19) {
    return 0;
  }
  const blue = 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  return clamp(blue);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function drawColorWheel(
  ctx: CanvasRenderingContext2D,
  minTemp: number,
  maxTemp: number
) {
  const radius = ctx.canvas.width / 2;
  const image = ctx.createImageData(2 * radius, 2 * radius);
  const data = image.data;

  const min = Math.max(minTemp, 2000);
  const max = Math.min(maxTemp, 40000);

  for (let x = -radius; x < radius; x++) {
    for (let y = -radius; y < radius; y++) {
      const [r] = xy2polar(x, y);

      if (r > radius) {
        continue;
      }

      const rowLength = 2 * radius;
      const adjustedX = x + radius;
      const adjustedY = y + radius;
      const pixelWidth = 4;
      const index = (adjustedX + adjustedY * rowLength) * pixelWidth;

      const fraction = (y / radius + 1) / 2;
      const alpha = 255;

      const temperature = min + fraction * (max - min);

      const rgb = temperature2rgb(temperature);
      data[index] = rgb[0];
      data[index + 1] = rgb[1];
      data[index + 2] = rgb[2];
      data[index + 3] = alpha;
    }
  }

  ctx.putImageData(image, 0, 0);
}

@customElement("ha-temp-color-picker")
class HaTempColorPicker extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Number, attribute: false })
  public renderSize?: number;

  @property({ type: Number })
  public value?: number;

  @property() min = 2000;

  @property() max = 10000;

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
    if (changedProps.has("min") || changedProps.has("max")) {
      this._generateColorWheel();
      this._resetPosition();
    }
    if (changedProps.has("value")) {
      if (this.value !== undefined && this._localValue !== this.value) {
        this._resetPosition();
      }
    }
  }

  _setupListeners() {
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
    }
  }

  private _resetPosition() {
    if (this.value === undefined) return;
    const [, y] = this._getCoordsFromValue(this.value);
    const currentX = this._cursorPosition?.[0] ?? 0;
    const x =
      Math.sign(currentX) * Math.min(Math.sqrt(1 - y ** 2), Math.abs(currentX));
    this._cursorPosition = [x, y];
    this._localValue = this.value;
  }

  private _getCoordsFromValue = (temperature: number): [number, number] => {
    const fraction = (temperature - this.min) / (this.max - this.min);
    const y = 2 * fraction - 1;
    return [0, y];
  };

  private _getValueFromCoord = (_x: number, y: number): number => {
    const fraction = (y + 1) / 2;
    const temperature = this.min + fraction * (this.max - this.min);
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

  _destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  render() {
    const size = this.renderSize || 400;
    const canvasSize = size * window.devicePixelRatio;

    const rgb =
      this._localValue !== undefined
        ? temperature2rgb(this._localValue)
        : ([255, 255, 255] as [number, number, number]);

    const [x, y] = this._cursorPosition ?? [0, 0];

    const cx = ((x + 1) * size) / 2;
    const cy = ((y + 1) * size) / 2;

    const markerPosition = `${cx}px, ${cy}px`;
    const markerScale = this._pressed ? "2" : "1";
    const markerOffset =
      this._pressed === "touch" ? `0px, -${size / 8}px` : "0px, 0px";

    return html`
      <div class="container ${classMap({ pressed: Boolean(this._pressed) })}">
        <canvas id="canvas" .width=${canvasSize} .height=${canvasSize}></canvas>
        <svg id="interaction" viewBox="0 0 ${size} ${size}" overflow="visible">
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
              r="12"
              style=${styleMap({
                fill: rgb2hex(rgb),
                transform: `translate(${markerOffset}) scale(${markerScale})`,
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
        <feOffset
          result="offOut"
          in="SourceAlpha"
          dx="2"
          dy="2"
        ></feOffset>
        <feGaussianBlur
          result="blurOut"
          in="offOut"
          stdDeviation="2"
        ></feGaussianBlur>
        <feComponentTransfer in="blurOut" result="alphaOut">
          <feFuncA type="linear" slope="0.3"></feFuncA>
        </feComponentTransfer>
        <feBlend
          in="SourceGraphic"
          in2="alphaOut"
          mode="normal"
        ></feBlend>
      </filter>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      .container {
        position: relative;
        width: 100%;
        height: 100%;
        cursor: pointer;
      }
      canvas {
        width: 100%;
        height: 100%;
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
        transition: transform 100ms ease-in-out, fill 100ms ease-in-out;
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

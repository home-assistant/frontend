import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import { css, html, LitElement, PropertyValues, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { hsv2rgb, rgb2hex } from "../common/color/convert-color";
import { rgbw2rgb, rgbww2rgb } from "../common/color/convert-light-color";
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

function rad2deg(rad: number) {
  return (rad / (2 * Math.PI)) * 360;
}

function deg2rad(deg: number) {
  return (deg / 360) * 2 * Math.PI;
}

function adjustRgb(
  rgb: [number, number, number],
  wv?: number,
  cw?: number,
  ww?: number,
  minKelvin?: number,
  maxKelvin?: number
) {
  if (wv != null) {
    return rgbw2rgb([...rgb, wv] as [number, number, number, number]);
  }
  if (cw != null && ww !== null) {
    return rgbww2rgb(
      [...rgb, cw, ww] as [number, number, number, number, number],
      minKelvin,
      maxKelvin
    );
  }
  return rgb;
}

function drawColorWheel(
  ctx: CanvasRenderingContext2D,
  colorBrightness = 255,
  wv?: number,
  cw?: number,
  ww?: number,
  minKelvin?: number,
  maxKelvin?: number
) {
  const radius = ctx.canvas.width / 2;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.beginPath();

  const cX = ctx.canvas.width / 2;
  const cY = ctx.canvas.width / 2;
  for (let angle = 0; angle < 360; angle += 1) {
    const startAngle = deg2rad(angle - 0.5);
    const endAngle = deg2rad(angle + 1.5);

    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.arc(cX, cY, radius, startAngle, endAngle);
    ctx.closePath();

    const gradient = ctx.createRadialGradient(cX, cY, 0, cX, cY, radius);
    const start = rgb2hex(
      adjustRgb(
        hsv2rgb([angle, 0, colorBrightness]),
        wv,
        cw,
        ww,
        minKelvin,
        maxKelvin
      )
    );
    const end = rgb2hex(
      adjustRgb(
        hsv2rgb([angle, 1, colorBrightness]),
        wv,
        cw,
        ww,
        minKelvin,
        maxKelvin
      )
    );
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

@customElement("ha-hs-color-picker")
class HaHsColorPicker extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Number, attribute: false })
  public renderSize?: number;

  @property({ type: Number })
  public value?: [number, number];

  @property({ type: Number })
  public colorBrightness?: number;

  @property({ type: Number })
  public wv?: number;

  @property({ type: Number })
  public cw?: number;

  @property({ type: Number })
  public ww?: number;

  @property({ type: Number })
  public minKelvin?: number;

  @property({ type: Number })
  public maxKelvin?: number;

  @query("#canvas") private _canvas!: HTMLCanvasElement;

  private _mc?: HammerManager;

  @state()
  private _pressed?: string;

  @state()
  private _cursorPosition?: [number, number];

  @state()
  private _localValue?: [number, number];

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._setupListeners();
    this._generateColorWheel();
  }

  private _generateColorWheel() {
    const ctx = this._canvas.getContext("2d")!;
    drawColorWheel(
      ctx,
      this.colorBrightness,
      this.wv,
      this.cw,
      this.ww,
      this.minKelvin,
      this.maxKelvin
    );
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
    if (
      changedProps.has("colorBrightness") ||
      changedProps.has("wv") ||
      changedProps.has("ww") ||
      changedProps.has("cw") ||
      changedProps.has("minKelvin") ||
      changedProps.has("maxKelvin")
    ) {
      this._generateColorWheel();
    }
    if (changedProps.has("value")) {
      if (
        this._localValue?.[0] !== this.value?.[0] ||
        this._localValue?.[1] !== this.value?.[1]
      ) {
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
    if (this.value === undefined) {
      this._cursorPosition = undefined;
      this._localValue = undefined;
      return;
    }
    this._cursorPosition = this._getCoordsFromValue(this.value);
    this._localValue = this.value;
  }

  private _getCoordsFromValue = (value: [number, number]): [number, number] => {
    const phi = deg2rad(value[0]);

    const r = Math.min(value[1], 1);

    const [x, y] = polar2xy(r, phi);

    return [x, y];
  };

  private _getValueFromCoord = (x: number, y: number): [number, number] => {
    const [r, phi] = xy2polar(x, y);

    const deg = Math.round(rad2deg(phi)) % 360;

    const hue = (deg + 360) % 360;
    const saturation = Math.round(Math.min(r, 1) * 100) / 100;

    return [hue, saturation];
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
        ? adjustRgb(
            hsv2rgb([
              this._localValue[0],
              this._localValue[1],
              this.colorBrightness ?? 255,
            ]),
            this.wv,
            this.cw,
            this.ww
          )
        : ([255, 255, 255] as [number, number, number]);

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
        cursor: pointer;
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
    "ha-hs-color-picker": HaHsColorPicker;
  }
}

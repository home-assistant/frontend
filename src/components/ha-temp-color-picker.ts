import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import { css, html, LitElement, PropertyValues, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { hsv2rgb, rgb2hex } from "../common/color/convert-color";

function xy2polar(x: number, y: number) {
  const r = Math.sqrt(x * x + y * y);
  const phi = Math.atan2(y, -x);
  return [r, phi];
}

function polar2xy(a: number, r: number) {
  const x = Math.cos((a * Math.PI) / 180) * r;
  const y = -Math.sin((a * Math.PI) / 180) * r;
  return [x, y];
}

function rad2deg(rad: number) {
  return ((rad + Math.PI) / (2 * Math.PI)) * 360;
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
      const temperature = (min + fraction * (max - min)) / 100;

      const alpha = 255;

      data[index] = getRed(temperature);
      data[index + 1] = getGreen(temperature);
      data[index + 2] = getBlue(temperature);
      data[index + 3] = alpha;
    }
  }

  ctx.putImageData(image, 0, 0);
}

@customElement("ha-temp-color-picker")
class HaTempColorPicker extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @state()
  public pressed?: string;

  @property({ type: Number, attribute: false })
  public renderSize?: number;

  @property({ type: Number })
  public value?: number;

  @query("#canvas") private _canvas!: HTMLCanvasElement;

  private _mc?: HammerManager;

  @state()
  private _coord?: [number, number];

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._setupListeners();
    this._generateColorWheel();
  }

  private _generateColorWheel() {
    const ctx = this._canvas.getContext("2d")!;
    drawColorWheel(ctx, 1700, 6535);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyListeners();
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
        this.pressed = e.pointerType;
        savedPosition = this._coord;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.pressed = undefined;
        this._coord = savedPosition;
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        this._coord = this._getCoordFromEvent(e);
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = undefined;
        this._coord = this._getCoordFromEvent(e);
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        this._coord = this._getCoordFromEvent(e);
      });
    }
  }

  private _getCoordFromEvent = (e: HammerInput): [number, number] => {
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

    const deg = rad2deg(phi);

    const hue = deg;
    const saturation = Math.min(r, 1);

    return [hue, saturation];
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

    const h = this._coord?.[0];
    const s = this._coord?.[1];

    const rgb = hsv2rgb([h ?? 0, s ?? 0, 255]);

    const [x, y] = this._coord ? polar2xy(...this._coord) : [0, 0];

    const cx = ((x + 1) * size) / 2;
    const cy = ((y + 1) * size) / 2;

    const markerScale = this.pressed ? "2" : "1";
    const markerOffset = this.pressed === "touch" ? `0 -${size / 8}` : "0 0";

    return html`
      <div class="container">
        <canvas id="canvas" .width=${canvasSize} .height=${canvasSize}></canvas>
        <svg id="interaction" viewBox="0 0 ${size} ${size}" overflow="visible">
          <defs>${this.renderSVGFilter()}</defs>
          <g transform="translate(${cx} ${cy})">
            <g>
              <circle
                style=${styleMap({
                  fill: rgb2hex(rgb),
                })}
                cx="0"
                cy="0"
                r="10"
                transform="translate(${markerOffset}) scale(${markerScale})"
              ></circle>
            </g>
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
        stroke: var(--ha-color-picker-marker-bordercolor, white);
        stroke-width: var(--ha-color-picker-marker-borderwidth, 2);
        filter: url(#marker-shadow);
        transition: transform 100ms ease-in-out;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-temp-color-picker": HaTempColorPicker;
  }
}

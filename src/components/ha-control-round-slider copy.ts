import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { arc } from "../resources/svg-arc";

const ROTATE_ANGLE = 135;
const MAX_ANGLE = 270;

function xy2polar(x: number, y: number) {
  const r = Math.sqrt(x * x + y * y);
  const phi = Math.atan2(y, x);
  return [r, phi];
}

function rad2deg(rad: number) {
  return (rad / (2 * Math.PI)) * 360;
}

@customElement("ha-control-round-slider")
export class HaControlRoundSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property({ type: Boolean, reflect: true })
  public pressed = false;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.setupListeners();
    this.setAttribute("role", "slider");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
  }

  private _mc?: HammerManager;

  private _getAngleFromEvent = (e: HammerInput) => {
    const bound = this._slider.getBoundingClientRect();
    const x = (2 * (e.center.x - bound.left - bound.width / 2)) / bound.width;
    const y = (2 * (e.center.y - bound.top - bound.height / 2)) / bound.height;

    const [, phi] = xy2polar(x, y);

    const offset = (360 - MAX_ANGLE) / 2;

    return Math.max(
      Math.min(
        ((rad2deg(phi) + offset - ROTATE_ANGLE + 360) % 360) - offset,
        MAX_ANGLE
      ),
      0.01
    );
  };

  @query("#interaction")
  private _interaction;

  @query("#slider")
  private _slider;

  setupListeners() {
    if (this._interaction && !this._mc) {
      this._mc = new Manager(this._interaction, { touchAction: "auto" });
      this._mc.add(
        new Pan({
          direction: DIRECTION_ALL,
          enable: true,
        })
      );

      this._mc.add(new Tap({ event: "singletap" }));

      let savedValue;
      this._mc.on("panstart", () => {
        if (this.disabled) return;
        this.pressed = true;
        savedValue = this.value;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.pressed = false;
        this.value = savedValue;
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        this.value = this._getAngleFromEvent(e);
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.value = this._getAngleFromEvent(e);
        this.pressed = false;
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        this.value = this._getAngleFromEvent(e);
      });
    }
  }

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  protected render(): TemplateResult {
    const startAngle = this.value ?? 0;
    const endAngle = 180;
    const currentAngle = 160;

    const trackPath = arc({ x: 0, y: 0, start: 0, end: MAX_ANGLE, r: 150 });

    console.log(this.value);

    const startPath = arc({
      x: 0,
      y: 0,
      start: 0,
      end: startAngle,
      r: 150,
    });

    const endPath = arc({
      x: 0,
      y: 0,
      start: endAngle,
      end: MAX_ANGLE,
      r: 150,
    });

    return html`
      <svg id="slider" viewBox="0 0 400 400" overflow="visible">
        <g
          id="background"
          transform="translate(200 200) rotate(${ROTATE_ANGLE})"
        >
          <g id="interaction">
            <path id="track-cursor" d=${trackPath} />
          </g>
          <g id="display">
            <path id="track" d=${trackPath} />
            <path id="start" d=${startPath} />
            <path id="end" d=${endPath} />
            <g transform="rotate(${currentAngle})">
              <circle cx="150" cy="0" r="8" fill="white"></circle>
            </g>
          </g>
        </g>
      </svg>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      svg {
        width: 400px;
        position: relative;
        display: block;
      }
      #interaction {
        fill: none;
        stroke: rgba(139, 145, 151, 0.1);
        stroke-linecap: round;
        stroke-width: 48px;
        cursor: pointer;
      }
      #display {
        pointer-events: none;
      }
      #track {
        fill: none;
        stroke: rgba(139, 145, 151, 0.3);
        stroke-linecap: round;
        stroke-width: 24px;
        cursor: pointer;
      }
      #start {
        fill: none;
        stroke: #ff9800;
        stroke-linecap: round;
        stroke-width: 24px;
        pointer-events: none;
      }
      #end {
        fill: none;
        stroke: #2196f3;
        stroke-linecap: round;
        stroke-width: 24px;
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-round-slider": HaControlRoundSlider;
  }
}

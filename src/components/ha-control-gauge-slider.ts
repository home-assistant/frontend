import {
  DIRECTION_ALL,
  Manager,
  Pan,
  Tap,
  TouchMouseInput,
} from "@egjs/hammerjs";
import {
  css,
  CSSResultGroup,
  LitElement,
  PropertyValues,
  svg,
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

@customElement("ha-control-gauge-slider")
export class HaControlGaugeSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ type: Number })
  public leftValue?: number;

  @property({ type: Number })
  public rightValue?: number;

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
    this._setupListeners();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  private _mc?: HammerManager;

  private _getAngleFromEvent = (e: HammerInput) => {
    const bound = this._slider.getBoundingClientRect();
    const x = (2 * (e.center.x - bound.left - bound.width / 2)) / bound.width;
    const y = (2 * (e.center.y - bound.top - bound.height / 2)) / bound.height;

    const [, phi] = xy2polar(x, y);

    const offset = (360 - MAX_ANGLE) / 2;

    return (
      Math.max(
        Math.min(
          ((rad2deg(phi) + offset - ROTATE_ANGLE + 360) % 360) - offset,
          MAX_ANGLE
        ),
        0
      ) / 360
    );
  };

  @query("#slider")
  private _slider;

  @query("#interaction")
  private _interaction;

  private _findNearestValue(value: number): "left" | "right" {
    const leftDistance = Math.abs(value - (this.leftValue ?? 0));
    const rightDistance = Math.abs(value - (this.rightValue ?? 1));
    return leftDistance < rightDistance ? "left" : "right";
  }

  _setupListeners() {
    if (this._interaction && !this._mc) {
      this._mc = new Manager(this._interaction, {
        inputClass: TouchMouseInput,
      });
      this._mc.add(
        new Pan({
          direction: DIRECTION_ALL,
          enable: true,
          threshold: 0,
        })
      );

      this._mc.add(new Tap({ event: "singletap" }));

      let savedValue;
      let selectedValue: "left" | "right" | undefined;

      this._mc.on("pan", (e) => {
        e.srcEvent.stopPropagation();
        e.srcEvent.preventDefault();
      });
      this._mc.on("panstart", (e) => {
        if (this.disabled) return;
        const value = this._getAngleFromEvent(e);
        this.pressed = true;
        selectedValue = this._findNearestValue(value);
        savedValue = this.leftValue;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.pressed = false;
        if (selectedValue === "right") {
          this.rightValue = savedValue;
        } else {
          this.leftValue = savedValue;
        }
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        const value = this._getAngleFromEvent(e);
        if (selectedValue === "right") {
          this.rightValue = value;
        } else {
          this.leftValue = value;
        }
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        const value = this._getAngleFromEvent(e);
        if (selectedValue === "right") {
          this.rightValue = value;
        } else {
          this.leftValue = value;
        }
        selectedValue = undefined;
        this.pressed = false;
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const value = this._getAngleFromEvent(e);
        const _selectedValue = this._findNearestValue(value);
        if (_selectedValue === "right") {
          this.rightValue = value;
        } else {
          this.leftValue = value;
        }
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
    const currentAngle = 160;

    const trackPath = arc({ x: 0, y: 0, start: 0, end: MAX_ANGLE, r: 150 });

    const f = 150 * 2 * Math.PI;
    const leftValue = this.leftValue ?? 0;

    const startStrokeDasharray = `${leftValue * f} ${(1 - leftValue) * f}`;

    const rightValue = 0.75 - (this.rightValue ?? 0.75);
    const endStrokeDasharray = `${rightValue * f} ${(1 - rightValue) * f}`;
    const endStrokeDashOffset = `${(rightValue + 0.25) * f}`;

    return svg`
      <svg id="slider" viewBox="0 0 400 400" overflow="visible">
        <g
          id="container"
          transform="translate(200 200) rotate(${ROTATE_ANGLE})"
        >
          <path id="interaction" d=${trackPath} />
          <g id="display">
            <path id="background" d=${trackPath} />
            <circle
              role="slider"
              tabindex="0"
              class="track"
              id="start"
              cx="0"
              cy="0"
              r="150"
              stroke-dasharray=${startStrokeDasharray}
              stroke-dashoffset="0"
            />
            <circle
              role="slider"
              tabindex="0"
              class="track"
              id="end"
              cx="0"
              cy="0"
              r="150"
              stroke-dasharray=${endStrokeDasharray}
              stroke-dashoffset=${endStrokeDashOffset}
            />
            <g transform="rotate(${currentAngle})">
              <circle cx="150" cy="0" r="8" fill="white" />
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
        display: block;
      }
      #interaction {
        fill: none;
        stroke: transparent;
        stroke-linecap: round;
        stroke-width: 48px;
        cursor: pointer;
        display: flex;
      }
      #background {
        fill: none;
        stroke: rgba(139, 145, 151, 0.3);
        stroke-linecap: round;
        stroke-width: 24px;
        cursor: pointer;
      }
      #display {
        pointer-events: none;
      }
      .track {
        outline: none;
        fill: none;
        stroke-linecap: round;
        stroke-width: 24px;
        transition: stroke-dasharray 300ms ease-in-out,
          stroke-dashoffset 300ms ease-in-out, stroke-width 300ms ease-in-out;
      }
      .track:focus-visible {
        stroke-width: 32px;
      }
      :host([pressed]) .track {
        transition: none;
      }

      #start {
        stroke: #ff9800;
        pointer-events: none;
      }

      #end {
        stroke: #2196f3;
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-gauge-slider": HaControlGaugeSlider;
  }
}

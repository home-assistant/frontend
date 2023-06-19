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
  nothing,
  PropertyValues,
  svg,
  TemplateResult,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { arc } from "../resources/svg-arc";

const MAX_ANGLE = 270;
const ROTATE_ANGLE = 360 - MAX_ANGLE / 2 - 90;

function xy2polar(x: number, y: number) {
  const r = Math.sqrt(x * x + y * y);
  const phi = Math.atan2(y, x);
  return [r, phi];
}

function rad2deg(rad: number) {
  return (rad / (2 * Math.PI)) * 360;
}

type SelectedSlider = "start" | "end";

@customElement("ha-control-gauge-slider")
export class HaControlGaugeSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ type: Boolean }) dual?: boolean;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number, attribute: "start-value" })
  public startValue?: number;

  @property({ type: Number, attribute: "end-value" })
  public endValue?: number;

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

  private _getPercentageFromEvent = (e: HammerInput) => {
    const bound = this._slider.getBoundingClientRect();
    const x = (2 * (e.center.x - bound.left - bound.width / 2)) / bound.width;
    const y = (2 * (e.center.y - bound.top - bound.height / 2)) / bound.height;

    const [, phi] = xy2polar(x, y);

    const offset = (360 - MAX_ANGLE) / 2;

    const angle = ((rad2deg(phi) + offset - ROTATE_ANGLE + 360) % 360) - offset;

    return Math.max(Math.min(angle / MAX_ANGLE, 1), 0);
  };

  @query("#slider")
  private _slider;

  @query("#interaction")
  private _interaction;

  private _findNearestValue(value: number): SelectedSlider {
    const startDistance = Math.abs(value - (this.startValue ?? 0));
    const endDistance = Math.abs(value - (this.endValue ?? 1));
    return startDistance < endDistance ? "start" : "end";
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
      let selectedValue: SelectedSlider | undefined;

      const setValue = (value: number, force?: SelectedSlider) => {
        if (this.dual) {
          if (force === "end" || selectedValue === "end") {
            this.endValue = value;
          } else {
            this.startValue = value;
          }
          return;
        }
        this.value = value;
      };

      this._mc.on("pan", (e) => {
        e.srcEvent.stopPropagation();
        e.srcEvent.preventDefault();
      });
      this._mc.on("panstart", (e) => {
        if (this.disabled) return;
        const value = this._getPercentageFromEvent(e);
        this.pressed = true;
        savedValue = this.startValue;
        if (this.dual) {
          selectedValue = this._findNearestValue(value);
        }
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.pressed = false;
        setValue(savedValue);
        if (this.dual) {
          selectedValue = undefined;
        }
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        const value = this._getPercentageFromEvent(e);
        setValue(value);
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        const value = this._getPercentageFromEvent(e);
        setValue(value);
        if (this.dual) {
          selectedValue = undefined;
        }
        this.pressed = false;
      });
      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const value = this._getPercentageFromEvent(e);
        setValue(value, this._findNearestValue(value));
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

    const maxRatio = MAX_ANGLE / 360;

    const f = 150 * 2 * Math.PI;
    const startValue = (this.dual ? this.startValue : this.value) ?? 0;
    const endValue = this.endValue ?? 1;

    const startArcLength = startValue * f * maxRatio;
    const startStrokeDasharray = `${startArcLength} ${f - startArcLength}`;

    const endArcLength = (1 - endValue) * f * maxRatio;
    const endStrokeDasharray = `${endArcLength} ${f - endArcLength}`;
    const endStrokeDashOffset = `${endArcLength + f * (1 - maxRatio)}`;

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
            ${
              this.dual
                ? svg`
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
                  `
                : nothing
            }
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
      :host {
        --control-gauge-slider-color: var(--primary-color);
        --control-gauge-slider-background: #8b97a3;
        --control-gauge-slider-background-opacity: 0.3;
        --control-gauge-slider-start-color: var(--control-gauge-slider-color);
        --control-gauge-slider-end-color: var(--control-gauge-slider-color);
      }
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
        stroke: var(--control-gauge-slider-background);
        opacity: var(--control-gauge-slider-background-opacity);
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
        stroke: var(--control-gauge-slider-start-color);
        pointer-events: none;
      }

      #end {
        stroke: var(--control-gauge-slider-end-color);
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

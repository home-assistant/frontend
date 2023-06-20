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
import { fireEvent } from "../common/dom/fire_event";
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

type SelectedDualSlider = "low" | "high";

declare global {
  interface HASSDomEvents {
    "value-changing": { value: unknown };
    "low-changing": { value: unknown };
    "low-changed": { value: unknown };
    "high-changing": { value: unknown };
    "high-changed": { value: unknown };
  }
}

@customElement("ha-control-circular-slider")
export class HaControlCircularSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean }) dual?: boolean;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public low?: number;

  @property({ type: Number })
  public high?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property({ type: Boolean, reflect: true })
  public pressed = false;

  private _valueToPercentage(value: number) {
    return (this._boundedValue(value) - this.min) / (this.max - this.min);
  }

  private _percentageToValue(value: number) {
    return (this.max - this.min) * value + this.min;
  }

  private _steppedValue(value: number) {
    return Math.round(value / this.step) * this.step;
  }

  private _boundedValue(value: number) {
    return Math.min(Math.max(value, this.min), this.max);
  }

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

  private _findSelectedDualSlider(value: number): SelectedDualSlider {
    const low = Math.max(this.low ?? this.min, this.min);
    const high = Math.min(this.high ?? this.max, this.max);

    if (low >= value) {
      return "low";
    }
    if (high <= value) {
      return "high";
    }
    const lowDistance = Math.abs(value - low);
    const highDistance = Math.abs(value - high);
    return lowDistance <= highDistance ? "low" : "high";
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
      let selectedValue: SelectedDualSlider | undefined;

      const setValue = (
        value: number,
        forceSelectedSlider?: SelectedDualSlider
      ) => {
        if (this.dual) {
          if (forceSelectedSlider === "high" || selectedValue === "high") {
            this.high = value;
          } else {
            this.low = value;
          }
        } else {
          this.value = value;
        }
      };

      const limitValue = (
        value: number,
        forceSelectedSlider?: SelectedDualSlider
      ) => {
        if (this.dual) {
          if (forceSelectedSlider === "high" || selectedValue === "high") {
            return Math.max(this.low ?? this.min, value);
          }
          return Math.min(this.high ?? this.max, value);
        }
        return value;
      };

      const fireValueEvent = (
        event: "changed" | "changing",
        params: { value: number | undefined },
        forceSelectedSlider?: SelectedDualSlider
      ) => {
        if (this.dual) {
          if (selectedValue || forceSelectedSlider) {
            const eventName = `${
              forceSelectedSlider ?? (selectedValue as SelectedDualSlider)
            }-${event}` as const;
            fireEvent(this, eventName, params);
          }
        } else {
          fireEvent(this, `value-${event}`, params);
        }
      };

      this._mc.on("pan", (e) => {
        e.srcEvent.stopPropagation();
        e.srcEvent.preventDefault();
      });
      this._mc.on("panstart", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const rawValue = this._percentageToValue(percentage);
        this.pressed = true;
        savedValue = this.low;
        if (this.dual) {
          selectedValue = this._findSelectedDualSlider(rawValue);
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
        const percentage = this._getPercentageFromEvent(e);
        const rawValue = this._percentageToValue(percentage);
        const limitedValue = limitValue(rawValue);
        setValue(limitedValue);
        const value = this._steppedValue(limitedValue);
        fireValueEvent("changing", { value });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = false;
        const percentage = this._getPercentageFromEvent(e);
        const rawValue = this._percentageToValue(percentage);
        const limitedValue = limitValue(rawValue);
        const value = this._steppedValue(limitedValue);
        setValue(value);
        fireValueEvent("changed", { value });
        fireValueEvent("changing", { value: undefined });
        if (this.dual) {
          selectedValue = undefined;
        }
      });
      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const rawValue = this._percentageToValue(percentage);
        const selected = this._findSelectedDualSlider(rawValue);
        const limitedValue = limitValue(rawValue, selected);
        const value = this._steppedValue(limitedValue);
        setValue(value, selected);
        fireValueEvent("changed", { value }, selected);
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
    const lowValue = this.dual ? this.low : this.value;
    const highValue = this.high;
    const lowPercentage = this._valueToPercentage(lowValue ?? this.min);
    const highPercentage = this._valueToPercentage(highValue ?? this.max);

    const lowArcLength = lowPercentage * f * maxRatio;
    const lowStrokeDasharray = `${lowArcLength} ${f - lowArcLength}`;

    const highArcLength = (1 - highPercentage) * f * maxRatio;
    const highStrokeDasharray = `${highArcLength} ${f - highArcLength}`;
    const highStrokeDashOffset = `${highArcLength + f * (1 - maxRatio)}`;

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
              id="low"
              cx="0"
              cy="0"
              r="150"
              stroke-dasharray=${lowStrokeDasharray}
              stroke-dashoffset="0"
            />
            ${
              this.dual
                ? svg`
                    <circle
                      role="slider"
                      tabindex="0"
                      class="track"
                      id="high"
                      cx="0"
                      cy="0"
                      r="150"
                      stroke-dasharray=${highStrokeDasharray}
                      stroke-dashoffset=${highStrokeDashOffset}
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
        --control-circular-slider-color: var(--primary-color);
        --control-circular-slider-background: #8b97a3;
        --control-circular-slider-background-opacity: 0.3;
        --control-circular-slider-low-color: var(
          --control-circular-slider-color
        );
        --control-circular-slider-high-color: var(
          --control-circular-slider-color
        );
      }
      svg {
        width: 400px;
        display: block;
      }
      #interaction {
        display: flex;
        fill: none;
        stroke: transparent;
        stroke-linecap: round;
        stroke-width: 48px;
        cursor: pointer;
      }
      :host([disabled]) #interaction {
        cursor: initial;
      }
      #background {
        fill: none;
        stroke: var(--control-circular-slider-background);
        opacity: var(--control-circular-slider-background-opacity);
        stroke-linecap: round;
        stroke-width: 24px;
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

      #low {
        stroke: var(--control-circular-slider-low-color);
        pointer-events: none;
      }

      #high {
        stroke: var(--control-circular-slider-high-color);
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-circular-slider": HaControlCircularSlider;
  }
}

import {
  DIRECTION_ALL,
  Manager,
  Pan,
  Tap,
  TouchMouseInput,
} from "@egjs/hammerjs";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
  svg,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { clamp } from "../common/number/clamp";
import { arc } from "../resources/svg-arc";

const MAX_ANGLE = 270;
const ROTATE_ANGLE = 360 - MAX_ANGLE / 2 - 90;
const RADIUS = 145;

function xy2polar(x: number, y: number) {
  const r = Math.sqrt(x * x + y * y);
  const phi = Math.atan2(y, x);
  return [r, phi];
}

function rad2deg(rad: number) {
  return (rad / (2 * Math.PI)) * 360;
}

type ActiveSlider = "low" | "high" | "value";

declare global {
  interface HASSDomEvents {
    "value-changing": { value: unknown };
    "low-changing": { value: unknown };
    "low-changed": { value: unknown };
    "high-changing": { value: unknown };
    "high-changed": { value: unknown };
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

@customElement("ha-control-circular-slider")
export class HaControlCircularSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean })
  public dual?: boolean;

  @property({ type: Boolean, reflect: true })
  public inverted?: boolean;

  @property({ type: String })
  public label?: string;

  @property({ type: String, attribute: "low-label" })
  public lowLabel?: string;

  @property({ type: String, attribute: "high-label" })
  public highLabel?: string;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public low?: number;

  @property({ type: Number })
  public high?: number;

  @property({ type: Number })
  public current?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @state()
  public _localValue?: number = this.value;

  @state()
  public _localLow?: number = this.low;

  @state()
  public _localHigh?: number = this.high;

  @state()
  public _activeSlider?: ActiveSlider;

  @state()
  public _lastSlider?: ActiveSlider;

  private _valueToPercentage(value: number) {
    return (
      (clamp(value, this.min, this.max) - this.min) / (this.max - this.min)
    );
  }

  private _percentageToValue(value: number) {
    return (this.max - this.min) * value + this.min;
  }

  private _steppedValue(value: number) {
    return Math.round(value / this.step) * this.step;
  }

  private _boundedValue(value: number) {
    const min =
      this._activeSlider === "high"
        ? Math.min(this._localLow ?? this.max)
        : this.min;
    const max =
      this._activeSlider === "low"
        ? Math.max(this._localHigh ?? this.min)
        : this.max;
    return Math.min(Math.max(value, min), max);
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._setupListeners();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._activeSlider) {
      if (changedProps.has("value")) {
        this._localValue = this.value;
      }
      if (changedProps.has("low")) {
        this._localLow = this.low;
      }
      if (changedProps.has("high")) {
        this._localHigh = this.high;
      }
    }
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

  private _findActiveSlider(value: number): ActiveSlider {
    if (!this.dual) return "value";
    const low = Math.max(this._localLow ?? this.min, this.min);
    const high = Math.min(this._localHigh ?? this.max, this.max);
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

  private _setActiveValue(value: number) {
    switch (this._activeSlider) {
      case "high":
        this._localHigh = value;
        break;
      case "low":
        this._localLow = value;
        break;
      case "value":
        this._localValue = value;
        break;
    }
  }

  private _getActiveValue(): number | undefined {
    switch (this._activeSlider) {
      case "high":
        return this._localHigh;
      case "low":
        return this._localLow;
      case "value":
        return this._localValue;
    }
    return undefined;
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

      this._mc.on("pan", (e) => {
        e.srcEvent.stopPropagation();
        e.srcEvent.preventDefault();
      });
      this._mc.on("panstart", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const raw = this._percentageToValue(percentage);
        this._activeSlider = this._findActiveSlider(raw);
        this._lastSlider = this._activeSlider;
        this.shadowRoot?.getElementById("#slider")?.focus();
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this._activeSlider = undefined;
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const raw = this._percentageToValue(percentage);
        const bounded = this._boundedValue(raw);
        this._setActiveValue(bounded);
        const stepped = this._steppedValue(bounded);
        if (this._activeSlider) {
          fireEvent(this, `${this._activeSlider}-changing`, { value: stepped });
        }
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const raw = this._percentageToValue(percentage);
        const bounded = this._boundedValue(raw);
        const stepped = this._steppedValue(bounded);
        this._setActiveValue(stepped);
        if (this._activeSlider) {
          fireEvent(this, `${this._activeSlider}-changing`, {
            value: undefined,
          });
          fireEvent(this, `${this._activeSlider}-changed`, { value: stepped });
        }
        this._activeSlider = undefined;
      });
      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const raw = this._percentageToValue(percentage);
        this._activeSlider = this._findActiveSlider(raw);
        const bounded = this._boundedValue(raw);
        const stepped = this._steppedValue(bounded);
        this._setActiveValue(stepped);
        if (this._activeSlider) {
          fireEvent(this, `${this._activeSlider}-changing`, {
            value: undefined,
          });
          fireEvent(this, `${this._activeSlider}-changed`, { value: stepped });
        }
        this._lastSlider = this._activeSlider;
        this.shadowRoot?.getElementById("#slider")?.focus();
        this._activeSlider = undefined;
      });
    }
  }

  private get _tenPercentStep() {
    return Math.max(this.step, (this.max - this.min) / 10);
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    if (this._lastSlider) {
      this.shadowRoot?.getElementById(this._lastSlider)?.focus();
    }
    this._activeSlider =
      this._lastSlider ?? ((e.currentTarget as any).id as ActiveSlider);
    this._lastSlider = undefined;

    const value = this._getActiveValue();

    switch (e.code) {
      case "ArrowRight":
      case "ArrowUp":
        this._setActiveValue(
          this._boundedValue((value ?? this.min) + this.step)
        );
        break;
      case "ArrowLeft":
      case "ArrowDown":
        this._setActiveValue(
          this._boundedValue((value ?? this.min) - this.step)
        );
        break;
      case "PageUp":
        this._setActiveValue(
          this._steppedValue(
            this._boundedValue((value ?? this.min) + this._tenPercentStep)
          )
        );
        break;
      case "PageDown":
        this._setActiveValue(
          this._steppedValue(
            this._boundedValue((value ?? this.min) - this._tenPercentStep)
          )
        );
        break;
      case "Home":
        this._setActiveValue(this._boundedValue(this.min));
        break;
      case "End":
        this._setActiveValue(this._boundedValue(this.max));
        break;
    }
    fireEvent(this, `${this._activeSlider}-changing`, {
      value: this._getActiveValue(),
    });
    this._activeSlider = undefined;
  }

  _handleKeyUp(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    this._activeSlider = (e.currentTarget as any).id as ActiveSlider;
    e.preventDefault();
    fireEvent(this, `${this._activeSlider}-changing`, {
      value: undefined,
    });
    fireEvent(this, `${this._activeSlider}-changed`, {
      value: this._getActiveValue(),
    });
    this._activeSlider = undefined;
  }

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  private _strokeDashArc(
    percentage: number,
    inverted?: boolean
  ): [string, string] {
    const maxRatio = MAX_ANGLE / 360;
    const f = RADIUS * 2 * Math.PI;
    if (inverted) {
      const arcLength = (1 - percentage) * f * maxRatio;
      const strokeDasharray = `${arcLength} ${f - arcLength}`;
      const strokeDashOffset = `${arcLength + f * (1 - maxRatio)}`;
      return [strokeDasharray, strokeDashOffset];
    }
    const arcLength = percentage * f * maxRatio;
    const strokeDasharray = `${arcLength} ${f - arcLength}`;
    const strokeDashOffset = "0";
    return [strokeDasharray, strokeDashOffset];
  }

  protected render(): TemplateResult {
    const trackPath = arc({ x: 0, y: 0, start: 0, end: MAX_ANGLE, r: RADIUS });

    const lowValue = this.dual ? this._localLow : this._localValue;
    const highValue = this._localHigh;
    const lowPercentage = this._valueToPercentage(lowValue ?? this.min);
    const highPercentage = this._valueToPercentage(highValue ?? this.max);

    const [lowStrokeDasharray, lowStrokeDashOffset] = this._strokeDashArc(
      lowPercentage,
      this.inverted
    );

    const [highStrokeDasharray, highStrokeDashOffset] = this._strokeDashArc(
      highPercentage,
      true
    );

    const currentPercentage = this._valueToPercentage(this.current ?? 0);
    const currentAngle = currentPercentage * MAX_ANGLE;

    return html`
      <svg
        id="slider"
        viewBox="0 0 320 320"
        overflow="visible"
        class=${classMap({
          pressed: Boolean(this._activeSlider),
        })}
        @keydown=${this._handleKeyDown}
        tabindex=${this._lastSlider ? "0" : "-1"}
      >
        <g
          id="container"
          transform="translate(160 160) rotate(${ROTATE_ANGLE})"
        >
          <g id="interaction">
            <path d=${trackPath} />
          </g>
          <g id="display">
            <path class="background" d=${trackPath} />
            ${lowValue != null
              ? svg`
                <circle
                  .id=${this.dual ? "low" : "value"}
                  class="track"
                  cx="0"
                  cy="0"
                  r=${RADIUS}
                  stroke-dasharray=${lowStrokeDasharray}
                  stroke-dashoffset=${lowStrokeDashOffset}
                  role="slider"
                  tabindex="0"
                  aria-valuemin=${this.min}
                  aria-valuemax=${this.max}
                  aria-valuenow=${
                    lowValue != null ? this._steppedValue(lowValue) : undefined
                  }
                  aria-disabled=${this.disabled}
                  aria-label=${ifDefined(this.lowLabel ?? this.label)}
                  @keydown=${this._handleKeyDown}
                  @keyup=${this._handleKeyUp}
                />
              `
              : nothing}
            ${this.dual && highValue != null
              ? svg`
                    <circle
                      id="high"
                      class="track"
                      cx="0"
                      cy="0"
                      r=${RADIUS}
                      stroke-dasharray=${highStrokeDasharray}
                      stroke-dashoffset=${highStrokeDashOffset}
                      role="slider"
                      tabindex="0"
                      aria-valuemin=${this.min}
                      aria-valuemax=${this.max}
                      aria-valuenow=${
                        highValue != null
                          ? this._steppedValue(highValue)
                          : undefined
                      }
                      aria-disabled=${this.disabled}
                      aria-label=${ifDefined(this.highLabel)}
                      @keydown=${this._handleKeyDown}
                      @keyup=${this._handleKeyUp}
                    />
                  `
              : nothing}
            ${this.current != null
              ? svg`
                <g
                  style=${styleMap({ "--current-angle": `${currentAngle}deg` })}
                  class="current"
                >
                  <line 
                    x1=${RADIUS - 12} 
                    y1="0" 
                    x2=${RADIUS - 15} 
                    y2="0" 
                    stroke-width="4" 
                  />
                  <line
                    x1=${RADIUS - 15}
                    y1="0"
                    x2=${RADIUS - 20}
                    y2="0"
                    stroke-linecap="round"
                    stroke-width="4"
                  />
                </g>
            `
              : nothing}
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
        width: 320px;
        display: block;
      }
      #slider {
        outline: none;
      }
      #interaction {
        display: flex;
        fill: none;
        stroke: transparent;
        stroke-linecap: round;
        stroke-width: 48px;
        cursor: pointer;
      }
      #display {
        pointer-events: none;
      }
      :host([disabled]) #interaction {
        cursor: initial;
      }

      .background {
        fill: none;
        stroke: var(--control-circular-slider-background);
        opacity: var(--control-circular-slider-background-opacity);
        transition: stroke 180ms ease-in-out, opacity 180ms ease-in-out;
        stroke-linecap: round;
        stroke-width: 24px;
      }

      .track {
        outline: none;
        fill: none;
        stroke-linecap: round;
        stroke-width: 24px;
        transition: stroke-width 300ms ease-in-out,
          stroke-dasharray 300ms ease-in-out,
          stroke-dashoffset 300ms ease-in-out, stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
      }

      .track:focus-visible {
        stroke-width: 28px;
      }

      .pressed .track {
        transition: stroke-width 300ms ease-in-out;
      }

      .current {
        stroke: var(--primary-text-color);
        transform: rotate(var(--current-angle, 0));
        transition: transform 300ms ease-in-out;
      }

      #value {
        stroke: var(--control-circular-slider-color);
      }

      #low {
        stroke: var(--control-circular-slider-low-color);
      }

      #high {
        stroke: var(--control-circular-slider-high-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-circular-slider": HaControlCircularSlider;
  }
}

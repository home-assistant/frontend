import {
  DIRECTION_ALL,
  Manager,
  Pan,
  Press,
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
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { clamp } from "../common/number/clamp";
import { svgArc } from "../resources/svg-arc";
import { isTouch } from "../util/is_touch";

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

export type ControlCircularSliderMode = "start" | "end" | "full";

@customElement("ha-control-circular-slider")
export class HaControlCircularSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public readonly = false;

  @property({ type: Boolean })
  public dual?: boolean;

  @property({ type: String })
  public mode?: ControlCircularSliderMode;

  @property({ type: Boolean })
  public inactive?: boolean;

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

  @property({ type: Boolean, attribute: "prevent-interaction-on-scroll" })
  public preventInteractionOnScroll?: boolean;

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

    if (
      (changedProps.has("_localValue") &&
        changedProps.get("_localValue") == null) ||
      (changedProps.has("_localLow") &&
        changedProps.get("_localLow") == null) ||
      (changedProps.has("_localHigh") &&
        changedProps.get("_localHigh") == null) ||
      changedProps.has("preventInteractionOnScroll")
    ) {
      this._destroyListeners();
      this._setupListeners();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  private _managers: HammerManager[] = [];

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

  @queryAll("[data-interaction]")
  private _interactions?: HTMLElement[];

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

  private _setupListeners() {
    if (this._interactions && this._managers.length === 0) {
      this._interactions.forEach((interaction) => {
        const mc = new Manager(interaction, {
          inputClass: TouchMouseInput,
        });

        this._managers.push(mc);

        const pressToActivate = this.preventInteractionOnScroll && isTouch;

        // If press to activate is true, a 50ms press is required to activate the slider
        mc.add(
          new Press({
            enable: pressToActivate,
            pointers: 1,
            time: 50,
          })
        );

        const panRecognizer = new Pan({
          direction: DIRECTION_ALL,
          enable: !pressToActivate,
          threshold: 0,
        });

        mc.add(panRecognizer);

        mc.add(new Tap({ event: "singletap" }));

        mc.on("press", (e) => {
          e.srcEvent.stopPropagation();
          e.srcEvent.preventDefault();
          if (this.disabled || this.readonly) return;
          const percentage = this._getPercentageFromEvent(e);
          const raw = this._percentageToValue(percentage);
          this._activeSlider = this._findActiveSlider(raw);
          const bounded = this._boundedValue(raw);
          this._setActiveValue(bounded);
          const stepped = this._steppedValue(bounded);
          if (this._activeSlider) {
            fireEvent(this, `${this._activeSlider}-changing`, {
              value: stepped,
            });
          }
          panRecognizer.set({ enable: true });
        });

        mc.on("pressup", (e) => {
          e.srcEvent.stopPropagation();
          e.srcEvent.preventDefault();
          const percentage = this._getPercentageFromEvent(e);
          const raw = this._percentageToValue(percentage);
          const bounded = this._boundedValue(raw);
          const stepped = this._steppedValue(bounded);
          this._setActiveValue(stepped);
          if (this._activeSlider) {
            fireEvent(this, `${this._activeSlider}-changing`, {
              value: undefined,
            });
            fireEvent(this, `${this._activeSlider}-changed`, {
              value: stepped,
            });
          }
          this._activeSlider = undefined;
        });

        mc.on("pan", (e) => {
          e.srcEvent.stopPropagation();
          e.srcEvent.preventDefault();
        });
        mc.on("panstart", (e) => {
          if (this.disabled || this.readonly) return;
          const percentage = this._getPercentageFromEvent(e);
          const raw = this._percentageToValue(percentage);
          this._activeSlider = this._findActiveSlider(raw);
          this._lastSlider = this._activeSlider;
          this.shadowRoot?.getElementById("#slider")?.focus();
        });
        mc.on("pancancel", () => {
          if (this.disabled || this.readonly) return;
          this._activeSlider = undefined;
          if (pressToActivate) {
            panRecognizer.set({ enable: false });
          }
        });
        mc.on("panmove", (e) => {
          if (this.disabled || this.readonly) return;
          const percentage = this._getPercentageFromEvent(e);
          const raw = this._percentageToValue(percentage);
          const bounded = this._boundedValue(raw);
          this._setActiveValue(bounded);
          const stepped = this._steppedValue(bounded);
          if (this._activeSlider) {
            fireEvent(this, `${this._activeSlider}-changing`, {
              value: stepped,
            });
          }
        });
        mc.on("panend", (e) => {
          if (this.disabled || this.readonly) return;
          const percentage = this._getPercentageFromEvent(e);
          const raw = this._percentageToValue(percentage);
          const bounded = this._boundedValue(raw);
          const stepped = this._steppedValue(bounded);
          this._setActiveValue(stepped);
          if (this._activeSlider) {
            fireEvent(this, `${this._activeSlider}-changing`, {
              value: undefined,
            });
            fireEvent(this, `${this._activeSlider}-changed`, {
              value: stepped,
            });
          }
          this._activeSlider = undefined;
          if (pressToActivate) {
            panRecognizer.set({ enable: false });
          }
        });
        mc.on("singletap", (e) => {
          if (this.disabled || this.readonly) return;
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
            fireEvent(this, `${this._activeSlider}-changed`, {
              value: stepped,
            });
          }
          this._lastSlider = this._activeSlider;
          this.shadowRoot?.getElementById("#slider")?.focus();
          this._activeSlider = undefined;
          if (pressToActivate) {
            panRecognizer.set({ enable: false });
          }
        });
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

  private _destroyListeners() {
    if (this._managers.length > 0) {
      this._managers.forEach((manager) => manager.destroy());
      this._managers = [];
    }
  }

  private _strokeCircleDashArc(value: number): [string, string] {
    return this._strokeDashArc(value, value);
  }

  private _strokeDashArc(from: number, to: number): [string, string] {
    const start = this._valueToPercentage(from);
    const end = this._valueToPercentage(to);

    const track = (RADIUS * 2 * Math.PI * MAX_ANGLE) / 360;
    const arc = Math.max((end - start) * track, 0);
    const arcOffset = start * track - 0.5;

    const strokeDasharray = `${arc} ${track - arc}`;
    const strokeDashOffset = `-${arcOffset}`;
    return [strokeDasharray, strokeDashOffset];
  }

  protected renderArc(
    id: string,
    value: number | undefined,
    mode: ControlCircularSliderMode
  ) {
    if (this.disabled) return nothing;

    const path = svgArc({
      x: 0,
      y: 0,
      start: 0,
      end: MAX_ANGLE,
      r: RADIUS,
    });

    const angle =
      value != null ? this._valueToPercentage(value) * MAX_ANGLE : undefined;

    const limit = mode === "end" ? this.max : this.min;

    const current = this.current ?? limit;
    const target = value ?? limit;

    const showActive =
      mode === "end"
        ? target <= current
        : mode === "start"
          ? current <= target
          : false;

    const showTarget = value != null;

    const activeArc = showTarget
      ? showActive
        ? mode === "end"
          ? this._strokeDashArc(target, current)
          : this._strokeDashArc(current, target)
        : this._strokeCircleDashArc(target)
      : undefined;

    const coloredArc =
      mode === "full"
        ? this._strokeDashArc(this.min, this.max)
        : mode === "end"
          ? this._strokeDashArc(target, limit)
          : this._strokeDashArc(limit, target);

    const targetCircle = showTarget
      ? this._strokeCircleDashArc(target)
      : undefined;

    const currentCircle =
      this.current != null &&
      this.current <= this.max &&
      this.current >= this.min &&
      (showActive || this.mode === "full")
        ? this._strokeCircleDashArc(this.current)
        : undefined;

    const onlyDotInteraction =
      (this.preventInteractionOnScroll && isTouch) || false;

    return svg`
      <g class=${classMap({ inactive: Boolean(this.inactive) })}>
        <path
          class="arc arc-clear"
          d=${path}
          stroke-dasharray=${coloredArc[0]}
          stroke-dashoffset=${coloredArc[1]}
        />
        <path
          class="arc arc-colored ${classMap({ [id]: true })}"
          d=${path}
          stroke-dasharray=${coloredArc[0]}
          stroke-dashoffset=${coloredArc[1]}
        />
        ${
          activeArc
            ? svg`
              <path
                .id=${id}
                d=${path}
                class="arc arc-active ${classMap({ [id]: true })}"
                stroke-dasharray=${activeArc[0]}
                stroke-dashoffset=${activeArc[1]}
                role="slider"
                tabindex="0"
                aria-valuemin=${this.min}
                aria-valuemax=${this.max}
                aria-valuenow=${
                  this._localValue != null
                    ? this._steppedValue(this._localValue)
                    : undefined
                }
                aria-disabled=${this.disabled}
                aria-readonly=${this.readonly}
                aria-label=${ifDefined(this.lowLabel ?? this.label)}
                @keydown=${this._handleKeyDown}
                @keyup=${this._handleKeyUp}
              />
            `
            : nothing
        }
        ${
          currentCircle
            ? svg`
              <path
                class="current arc-current"
                d=${path}
                stroke-dasharray=${currentCircle[0]}
                stroke-dashoffset=${currentCircle[1]}
              />
          `
            : nothing
        }
        ${
          targetCircle
            ? svg`
              <!-- Use circle instead of path for interaction (Safari doesn't support well pointer-events with stroke-dasharray) -->
              <circle 
                transform="rotate(${angle} 0 0)" 
                ?data-interaction=${onlyDotInteraction} 
                cx=${RADIUS}
                cy="0" 
                />
              <path
                d=${path}
                stroke-dasharray=${targetCircle[0]}
                stroke-dashoffset=${targetCircle[1]}
              />
              <path
                class="target-border ${classMap({ [id]: true })}"
                d=${path}
                stroke-dasharray=${targetCircle[0]}
                stroke-dashoffset=${targetCircle[1]}
              />
              <path
                class="target"
                d=${path}
                stroke-dasharray=${targetCircle[0]}
                stroke-dashoffset=${targetCircle[1]}
              />
          `
            : nothing
        }
      </g>
    `;
  }

  protected render(): TemplateResult {
    const trackPath = svgArc({
      x: 0,
      y: 0,
      start: 0,
      end: MAX_ANGLE,
      r: RADIUS,
    });

    const lowValue = this.dual ? this._localLow : this._localValue;
    const highValue = this._localHigh;
    const current = this.current;

    const currentStroke = current
      ? this._strokeCircleDashArc(current)
      : undefined;

    const onlyDotInteraction =
      (this.preventInteractionOnScroll && isTouch) || false;

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
          <path d=${trackPath} ?data-interaction=${!onlyDotInteraction} />
          <path class="background" d=${trackPath} />
          ${currentStroke
            ? svg`
                  <path
                    class="current"
                    d=${trackPath}
                    stroke-dasharray=${currentStroke[0]}
                    stroke-dashoffset=${currentStroke[1]}
                  />
                `
            : nothing}
          ${lowValue != null || this.mode === "full"
            ? this.renderArc(
                this.dual ? "low" : "value",
                lowValue,
                (!this.dual && this.mode) || "start"
              )
            : nothing}
          ${this.dual && highValue != null
            ? this.renderArc("high", highValue, "end")
            : nothing}
        </g>
      </svg>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --control-circular-slider-color: var(--primary-color);
        --control-circular-slider-background: var(--disabled-color);
        --control-circular-slider-background-opacity: 0.3;
        --control-circular-slider-low-color: var(
          --control-circular-slider-color
        );
        --control-circular-slider-high-color: var(
          --control-circular-slider-color
        );
        --control-circular-slider-interaction-margin: 12px;
        width: 320px;
        display: block;
      }
      svg {
        width: 100%;
        display: block;
        pointer-events: none;
      }
      g {
        fill: none;
      }
      #slider {
        outline: none;
      }
      path[data-interaction] {
        fill: none;
        cursor: pointer;
        pointer-events: auto;
        stroke: transparent;
        stroke-linecap: round;
        stroke-width: calc(
          24px + 2 * var(--control-circular-slider-interaction-margin)
        );
      }
      circle[data-interaction] {
        r: calc(12px + var(--control-circular-slider-interaction-margin));
        fill: transparent;
        cursor: pointer;
        pointer-events: auto;
      }
      :host([disabled]) [data-interaction],
      :host([readonly]) [data-interaction] {
        cursor: initial;
        pointer-events: none;
      }

      .background {
        fill: none;
        stroke: var(--control-circular-slider-background);
        opacity: var(--control-circular-slider-background-opacity);
        transition:
          stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
        stroke-linecap: round;
        stroke-width: 24px;
      }

      .arc {
        fill: none;
        stroke-linecap: round;
        stroke-width: 24px;
        transition:
          stroke-width 300ms ease-in-out,
          stroke-dasharray 300ms ease-in-out,
          stroke-dashoffset 300ms ease-in-out,
          stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
      }

      .target {
        fill: none;
        stroke-linecap: round;
        stroke-width: 18px;
        stroke: white;
        transition:
          stroke-width 300ms ease-in-out,
          stroke-dasharray 300ms ease-in-out,
          stroke-dashoffset 300ms ease-in-out,
          stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
      }

      .target-border {
        fill: none;
        stroke-linecap: round;
        stroke-width: 24px;
        stroke: white;
        transition:
          stroke-width 300ms ease-in-out,
          stroke-dasharray 300ms ease-in-out,
          stroke-dashoffset 300ms ease-in-out,
          stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
      }

      .current {
        fill: none;
        stroke-linecap: round;
        stroke-width: 8px;
        stroke: var(--primary-text-color);
        opacity: 0.5;
        transition:
          stroke-width 300ms ease-in-out,
          stroke-dasharray 300ms ease-in-out,
          stroke-dashoffset 300ms ease-in-out,
          stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
      }

      .arc-current {
        stroke: var(--clear-background-color);
      }

      .arc-clear {
        stroke: var(--clear-background-color);
      }
      .arc-colored {
        opacity: 0.5;
      }
      .arc-active {
        outline: none;
      }
      .arc-active:focus-visible {
        stroke-width: 28px;
      }

      .pressed .arc,
      .pressed .target,
      .pressed .target-border,
      .pressed .current {
        transition:
          stroke-width 300ms ease-in-out,
          stroke 180ms ease-in-out,
          opacity 180ms ease-in-out;
      }

      .inactive .arc,
      .inactive .arc-current {
        opacity: 0;
      }

      .value {
        stroke: var(--control-circular-slider-color);
      }

      .low {
        stroke: var(--control-circular-slider-low-color);
      }

      .high {
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

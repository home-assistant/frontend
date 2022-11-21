import "hammerjs";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "slider-moved": { value?: number };
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

const getPercentageFromEvent = (e: HammerInput, vertical: boolean) => {
  if (vertical) {
    const y = e.center.y;
    const offset = e.target.getBoundingClientRect().top;
    const total = e.target.clientHeight;
    return Math.max(Math.min(1, 1 - (y - offset) / total), 0);
  }
  const x = e.center.x;
  const offset = e.target.getBoundingClientRect().left;
  const total = e.target.clientWidth;
  return Math.max(Math.min(1, (x - offset) / total), 0);
};

@customElement("ha-bar-slider")
export class HaBarSlider extends LitElement {
  @property({ type: Boolean })
  public disabled = false;

  @property()
  public mode?: "start" | "end" | "indicator" = "start";

  @property({ type: Boolean })
  public vertical = false;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  private _mc?: HammerManager;

  @property({ type: Boolean, reflect: true })
  public pressed = false;

  valueToPercentage(value: number) {
    return (value - this.min) / (this.max - this.min);
  }

  percentageToValue(value: number) {
    return (this.max - this.min) * value + this.min;
  }

  steppedValue(value: number) {
    return Math.round(value / this.step) * this.step;
  }

  boundedValue(value: number) {
    return Math.min(Math.max(value, this.min), this.max);
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.setupListeners();
    this.setAttribute("role", "slider");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("value")) {
      const valuenow = this.steppedValue(this.value ?? 0);
      this.setAttribute("aria-valuenow", valuenow.toString());
    }
    if (changedProps.has("min")) {
      this.setAttribute("aria-valuemin", this.min.toString());
    }
    if (changedProps.has("max")) {
      this.setAttribute("aria-valuemax", this.max.toString());
    }
    if (changedProps.has("vertical")) {
      const orientation = this.vertical ? "vertical" : "horizontal";
      this.setAttribute("aria-orientation", orientation);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyListeners();
  }

  @query("#slider")
  private slider;

  setupListeners() {
    if (this.slider && !this._mc) {
      this._mc = new Hammer.Manager(this.slider, {
        touchAction: this.vertical ? "pan-x" : "pan-y",
      });
      this._mc.add(
        new Hammer.Pan({
          threshold: 10,
          direction: Hammer.DIRECTION_ALL,
          enable: true,
        })
      );

      this._mc.add(new Hammer.Tap({ event: "singletap" }));

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
        const percentage = getPercentageFromEvent(e, this.vertical);
        this.value = this.percentageToValue(percentage);
        const value = this.steppedValue(this.value);
        fireEvent(this, "slider-moved", { value });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = false;
        const percentage = getPercentageFromEvent(e, this.vertical);
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "slider-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this.value });
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const percentage = getPercentageFromEvent(e, this.vertical);
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "value-changed", { value: this.value });
      });

      this.addEventListener("keydown", this._handleKeyDown);
      this.addEventListener("keyup", this._handleKeyUp);
    }
  }

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
    this.removeEventListener("keydown", this._handleKeyDown);
    this.removeEventListener("keyup", this._handleKeyDown);
  }

  private get _tenPercentStep() {
    return Math.max(this.step, (this.max - this.min) / 10);
  }

  _handleKeyDown(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    switch (e.code) {
      case "ArrowRight":
      case "ArrowUp":
        this.value = this.boundedValue((this.value ?? 0) + this.step);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        this.value = this.boundedValue((this.value ?? 0) - this.step);
        break;
      case "PageUp":
        this.value = this.steppedValue(
          this.boundedValue((this.value ?? 0) + this._tenPercentStep)
        );
        break;
      case "PageDown":
        this.value = this.steppedValue(
          this.boundedValue((this.value ?? 0) - this._tenPercentStep)
        );
        break;
      case "Home":
        this.value = this.min;
        break;
      case "End":
        this.value = this.max;
        break;
    }
    fireEvent(this, "slider-moved", { value: this.value });
  }

  _handleKeyUp(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    fireEvent(this, "value-changed", { value: this.value });
  }

  protected render(): TemplateResult {
    return html`
      <div
        id="slider"
        class="slider"
        style=${styleMap({
          "--value": `${this.valueToPercentage(this.value ?? 0)}`,
        })}
      >
        <div class="slider-track-background"></div>
        ${this.mode === "indicator"
          ? html`
              <div
                class=${classMap({
                  "slider-track-indicator": true,
                  vertical: this.vertical,
                })}
              ></div>
            `
          : html`
              <div
                class=${classMap({
                  "slider-track-bar": true,
                  vertical: this.vertical,
                  [this.mode ?? "start"]: true,
                })}
              ></div>
            `}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --slider-bar-color: rgb(var(--rgb-primary-color));
        --slider-bar-background: rgba(var(--rgb-disabled-color), 0.2);
        --slider-bar-thickness: 40px;
        --slider-bar-border-radius: 12px;
        height: var(--slider-bar-thickness);
        width: 100%;
      }
      :host([vertical]) {
        width: var(--slider-bar-thickness);
        height: 100%;
      }
      .slider {
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: var(--slider-bar-border-radius);
        transform: translateZ(0);
        overflow: hidden;
        cursor: pointer;
      }
      .slider * {
        pointer-events: none;
      }
      .slider .slider-track-background {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background: var(--slider-bar-background);
      }
      .slider .slider-track-bar {
        --border-radius: calc(var(--slider-bar-border-radius) / 2);
        --handle-size: 4px;
        --handle-margin: calc(var(--slider-bar-thickness) / 8);
        position: absolute;
        height: 100%;
        width: 100%;
        background-color: var(--slider-bar-color);
        transition: transform 180ms ease-in-out;
      }
      .slider .slider-track-bar::after {
        display: block;
        content: "";
        position: absolute;
        margin: auto;
        border-radius: var(--handle-size);
        background-color: white;
      }
      .slider .slider-track-bar {
        top: 0;
        left: 0;
        transform: translate3d(calc((var(--value, 0) - 1) * 100%), 0, 0);
        border-radius: 0 var(--border-radius) var(--border-radius) 0;
      }
      .slider .slider-track-bar:after {
        top: 0;
        bottom: 0;
        right: var(--handle-margin);
        height: 50%;
        width: var(--handle-size);
      }
      .slider .slider-track-bar.end {
        right: 0;
        left: initial;
        transform: translate3d(calc(var(--value, 0) * 100%), 0, 0);
        border-radius: var(--border-radius) 0 0 var(--border-radius);
      }
      .slider .slider-track-bar.end::after {
        right: initial;
        left: var(--handle-margin);
      }

      .slider .slider-track-bar.vertical {
        bottom: 0;
        left: 0;
        transform: translate3d(0, calc((1 - var(--value, 0)) * 100%), 0);
        border-radius: var(--border-radius) var(--border-radius) 0 0;
      }
      .slider .slider-track-bar.vertical:after {
        top: var(--handle-margin);
        right: 0;
        left: 0;
        bottom: initial;
        width: 50%;
        height: var(--handle-size);
      }
      .slider .slider-track-bar.vertical.end {
        top: 0;
        bottom: initial;
        transform: translate3d(0, calc((0 - var(--value, 0)) * 100%), 0);
        border-radius: 0 0 var(--border-radius) var(--border-radius);
      }
      .slider .slider-track-bar.vertical.end::after {
        top: initial;
        bottom: var(--handle-margin);
      }

      .slider .slider-track-indicator:after {
        display: block;
        content: "";
        background-color: rgb(var(--rgb-secondary-text-color));
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
        border-radius: var(--handle-size);
      }

      .slider .slider-track-indicator {
        --indicator-size: calc(var(--slider-bar-thickness) / 4);
        --handle-size: 4px;
        position: absolute;
        background-color: white;
        border-radius: var(--handle-size);
        transition: left 180ms ease-in-out, bottom 180ms ease-in-out;
        top: 0;
        bottom: 0;
        left: calc(var(--value, 0) * (100% - var(--indicator-size)));
        width: var(--indicator-size);
      }
      .slider .slider-track-indicator:after {
        height: 50%;
        width: var(--handle-size);
      }

      .slider .slider-track-indicator.vertical {
        top: initial;
        right: 0;
        left: 0;
        bottom: calc(var(--value, 0) * (100% - var(--indicator-size)));
        height: var(--indicator-size);
        width: 100%;
      }
      .slider .slider-track-indicator.vertical:after {
        height: var(--handle-size);
        width: 50%;
      }

      :host([pressed]) .slider-track-bar,
      :host([pressed]) .slider-track-indicator {
        transition: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-slider": HaBarSlider;
  }
}

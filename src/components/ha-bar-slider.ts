import "hammerjs";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
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
  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: "track-mode" })
  public trackMode?: "indicator" | "start" | "end" = "start";

  @property({ attribute: "orientation" })
  public orientation?: "horizontal" | "vertical" = "horizontal";

  @property({ attribute: false, type: Number, reflect: true })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property()
  public label?: string;

  private _mc?: HammerManager;

  @state() controlled = false;

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
        touchAction: this.orientation === "vertical" ? "pan-x" : "pan-y",
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
        this.controlled = true;
        savedValue = this.value;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.controlled = false;
        this.value = savedValue;
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        const percentage = getPercentageFromEvent(
          e,
          this.orientation === "vertical"
        );
        this.value = this.percentageToValue(percentage);
        const value = this.steppedValue(this.value);
        fireEvent(this, "slider-moved", { value });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.controlled = false;
        const percentage = getPercentageFromEvent(
          e,
          this.orientation === "vertical"
        );
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "slider-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this.value });
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const percentage = getPercentageFromEvent(
          e,
          this.orientation === "vertical"
        );
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "value-changed", { value: this.value });
      });
    }
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

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <div
        id="slider"
        class=${classMap({
          slider: true,
          controlled: this.controlled,
        })}
        style=${styleMap({
          "--value": `${this.valueToPercentage(this.value ?? 0)}`,
        })}
        tabindex="0"
        @keydown=${this._handleKeyDown}
        @keyup=${this._handleKeyUp}
        role="slider"
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this.value ?? 0}
        aria-labelledby=${ifDefined(this.label)}
      >
        <div class="slider-track-background"></div>
        ${this.trackMode === "indicator"
          ? html`<div
              class=${classMap({
                "slider-track-indicator": true,
                [this.orientation ?? "horizontal"]: true,
              })}
            ></div> `
          : html`<div
              class=${classMap({
                "slider-track-bar": true,
                [this.orientation ?? "horizontal"]: true,
                [this.trackMode ?? "start"]: true,
              })}
            ></div>`}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --main-color: rgba(var(--rgb-primary-color), 1);
        --bg-gradient: none;
        --bg-color: rgba(var(--rgb-secondary-text-color), 0.2);
        height: 40px;
        width: 100%;
      }
      :host([orientation="vertical"]) {
        width: 40px;
        height: 100%;
      }
      .slider {
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: 12px;
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
        background-color: var(--bg-color);
        background-image: var(--gradient);
      }
      .slider .slider-track-bar {
        position: absolute;
        height: 100%;
        width: 100%;
        background-color: var(--main-color);
        transition: transform 180ms ease-in-out;
      }
      .slider .slider-track-bar::after {
        display: block;
        content: "";
        position: absolute;
        margin: auto;
        border-radius: 2px;
        background-color: white;
      }
      .slider .slider-track-bar.horizontal {
        top: 0;
        left: 0;
        transform: translate3d(calc((var(--value, 0) - 1) * 100%), 0, 0);
        border-radius: 0 8px 8px 0;
      }
      .slider .slider-track-bar.horizontal:after {
        top: 0;
        bottom: 0;
        right: 6px;
        height: 50%;
        width: 3px;
      }
      .slider .slider-track-bar.horizontal.end {
        right: 0;
        left: initial;
        transform: translate3d(calc(var(--value, 0) * 100%), 0, 0);
        border-radius: 8px 0 0 8px;
      }
      .slider .slider-track-bar.horizontal.end::after {
        right: initial;
        left: 6px;
      }

      .slider .slider-track-bar.vertical {
        bottom: 0;
        left: 0;
        transform: translate3d(0, calc((1 - var(--value, 0)) * 100%), 0);
        border-radius: 8px 8px 0 0;
      }
      .slider .slider-track-bar.vertical:after {
        top: 6px;
        right: 0;
        left: 0;
        width: 50%;
        height: 3px;
      }
      .slider .slider-track-bar.vertical.end {
        top: 0;
        bottom: initial;
        transform: translate3d(0, calc((0 - var(--value, 0)) * 100%), 0);
        border-radius: 0 0 8px 8px;
      }
      .slider .slider-track-bar.vertical.end::after {
        top: initial;
        bottom: 6px;
      }

      .slider .slider-track-indicator {
        position: absolute;
        border-radius: 3px;
        background-color: white;
      }
      .slider .slider-track-indicator:after {
        display: block;
        content: "";
        background-color: var(--main-color);
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
        border-radius: 1px;
        transition: left 180ms ease-in-out, bottom 180ms ease-in-out;
      }

      .slider .slider-track-indicator.horizontal {
        top: 0;
        bottom: 0;
        left: calc(var(--value, 0) * (100% - 10px));
        width: 10px;
      }
      .slider .slider-track-indicator.horizontal:after {
        height: 50%;
        width: 2px;
      }

      .slider .slider-track-indicator.vertical {
        right: 0;
        left: 0;
        bottom: calc(var(--value, 0) * (100% - 10px));
        height: 10px;
      }
      .slider .slider-track-indicator.vertical:after {
        height: 2px;
        width: 50%;
      }

      .controlled .slider-track-bar {
        transition: none;
      }
      .controlled .slider-track-indicator {
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

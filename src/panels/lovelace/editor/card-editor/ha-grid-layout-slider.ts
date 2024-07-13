import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../../common/dom/fire_event";

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

@customElement("ha-grid-layout-slider")
export class HaGridLayoutSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ attribute: "touch-action" })
  public touchAction?: string;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 1;

  @property({ type: Number })
  public max = 4;

  @property({ type: Number })
  public range?: number;

  @state()
  public pressed = false;

  private _mc?: HammerManager;

  private get _range() {
    return this.range ?? this.max;
  }

  private _valueToPercentage(value: number) {
    const percentage = this._boundedValue(value) / this._range;
    return percentage;
  }

  private _percentageToValue(percentage: number) {
    return this._range * percentage;
  }

  private _steppedValue(value: number) {
    return Math.round(value / this.step) * this.step;
  }

  private _boundedValue(value: number) {
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
      const valuenow = this._steppedValue(this.value ?? 0);
      this.setAttribute("aria-valuenow", valuenow.toString());
      this.setAttribute("aria-valuetext", valuenow.toString());
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
      this._mc = new Manager(this.slider, {
        touchAction: this.touchAction ?? (this.vertical ? "pan-x" : "pan-y"),
      });
      this._mc.add(
        new Pan({
          threshold: 10,
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
        const percentage = this._getPercentageFromEvent(e);
        this.value = this._percentageToValue(percentage);
        const value = this._steppedValue(this._boundedValue(this.value));
        fireEvent(this, "slider-moved", { value });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = false;
        const percentage = this._getPercentageFromEvent(e);
        const value = this._percentageToValue(percentage);
        this.value = this._steppedValue(this._boundedValue(value));
        fireEvent(this, "slider-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this.value });
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        const value = this._percentageToValue(percentage);
        this.value = this._steppedValue(this._boundedValue(value));
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
    this.removeEventListener("keyup", this._handleKeyUp);
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
        this.value = this._boundedValue((this.value ?? 0) + this.step);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        this.value = this._boundedValue((this.value ?? 0) - this.step);
        break;
      case "PageUp":
        this.value = this._steppedValue(
          this._boundedValue((this.value ?? 0) + this._tenPercentStep)
        );
        break;
      case "PageDown":
        this.value = this._steppedValue(
          this._boundedValue((this.value ?? 0) - this._tenPercentStep)
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

  private _getPercentageFromEvent = (e: HammerInput) => {
    if (this.vertical) {
      const y = e.center.y;
      const offset = e.target.getBoundingClientRect().top;
      const total = e.target.clientHeight;
      return Math.max(Math.min(1, (y - offset) / total), 0);
    }
    const x = e.center.x;
    const offset = e.target.getBoundingClientRect().left;
    const total = e.target.clientWidth;
    return Math.max(Math.min(1, (x - offset) / total), 0);
  };

  protected render(): TemplateResult {
    return html`
      <div
        class="container${classMap({
          pressed: this.pressed,
        })}"
        style=${styleMap({
          "--value": `${this._valueToPercentage(this.value ?? 0)}`,
        })}
      >
        <div id="slider" class="slider">
          <div class="track">
            <div class="background"></div>
            <div
              class="active"
              style=${styleMap({
                "--min": `${this.min / this._range}`,
                "--max": `${1 - this.max / this._range}`,
              })}
            ></div>
          </div>
          ${this.value !== undefined
            ? html`<div class="handle"></div>`
            : nothing}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --grid-layout-slider: 48px;
        height: var(--grid-layout-slider);
        width: 100%;
        outline: none;
        transition: box-shadow 180ms ease-in-out;
      }
      :host(:focus-visible) {
        box-shadow: 0 0 0 2px var(--primary-color);
      }
      :host([vertical]) {
        width: var(--grid-layout-slider);
        height: 100%;
      }
      .container {
        position: relative;
        height: 100%;
        width: 100%;
      }
      .slider {
        position: relative;
        height: 100%;
        width: 100%;
        transform: translateZ(0);
        overflow: visible;
        cursor: pointer;
      }
      .slider * {
        pointer-events: none;
      }
      .track {
        position: absolute;
        inset: 0;
        margin: auto;
        height: 16px;
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
      }
      :host([vertical]) .track {
        width: 16px;
        height: 100%;
      }
      .background {
        position: absolute;
        inset: 0;
        background: var(--disabled-color);
        opacity: 0.2;
      }
      .active {
        position: absolute;
        background: grey;
        opacity: 0.7;
        top: 0;
        right: calc(var(--max) * 100%);
        bottom: 0;
        left: calc(var(--min) * 100%);
      }
      :host([vertical]) .active {
        top: calc(var(--min) * 100%);
        right: 0;
        bottom: calc(var(--max) * 100%);
        left: 0;
      }
      .handle {
        position: absolute;
        top: 0;
        height: 100%;
        width: 16px;
        transform: translate(-50%, 0);
        background: var(--card-background-color);
        left: calc(var(--value, 0%) * 100%);
        transition:
          left 180ms ease-in-out,
          top 180ms ease-in-out;
      }
      :host([vertical]) .handle {
        transform: translate(0, -50%);
        left: 0;
        top: calc(var(--value, 0%) * 100%);
        height: 16px;
        width: 100%;
      }
      .handle::after {
        position: absolute;
        inset: 0;
        width: 4px;
        border-radius: 2px;
        height: 100%;
        margin: auto;
        background: grey;
        content: "";
      }
      :host([vertical]) .handle::after {
        height: 4px;
        width: 100%;
      }
      :host(:disabled) .slider {
        cursor: not-allowed;
      }
      :host(:disabled) .handle:after {
        background: var(--disabled-color);
      }
      :host(:disabled) .active {
        background: var(--disabled-color);
      }
      .pressed .handle {
        transition: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-layout-slider": HaGridLayoutSlider;
  }
}

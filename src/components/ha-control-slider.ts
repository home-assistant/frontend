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

@customElement("ha-control-slider")
export class HaControlSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property()
  public mode?: "start" | "end" | "cursor" = "start";

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ type: Boolean, attribute: "show-handle" })
  public showHandle = false;

  @property({ type: Boolean, attribute: "inverted" })
  public inverted = false;

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
    const percentage =
      (this.boundedValue(value) - this.min) / (this.max - this.min);
    return this.inverted ? 1 - percentage : percentage;
  }

  percentageToValue(percentage: number) {
    return (
      (this.max - this.min) * (this.inverted ? 1 - percentage : percentage) +
      this.min
    );
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
      this._mc = new Manager(this.slider, {
        touchAction: this.vertical ? "pan-x" : "pan-y",
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
        this.value = this.percentageToValue(percentage);
        const value = this.steppedValue(this.value);
        fireEvent(this, "slider-moved", { value });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = false;
        const percentage = this._getPercentageFromEvent(e);
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "slider-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this.value });
      });

      this._mc.on("singletap", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
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

  private _getPercentageFromEvent = (e: HammerInput) => {
    if (this.vertical) {
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
        <slot name="background"></slot>
        ${this.mode === "cursor"
          ? this.value != null
            ? html`
                <div
                  class=${classMap({
                    "slider-track-cursor": true,
                  })}
                ></div>
              `
            : null
          : html`
              <div
                class=${classMap({
                  "slider-track-bar": true,
                  [this.mode ?? "start"]: true,
                  "show-handle": this.showHandle,
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
        --control-slider-color: var(--primary-color);
        --control-slider-background: var(--disabled-color);
        --control-slider-background-opacity: 0.2;
        --control-slider-thickness: 40px;
        --control-slider-border-radius: 10px;
        height: var(--control-slider-thickness);
        width: 100%;
        border-radius: var(--control-slider-border-radius);
        outline: none;
        transition: box-shadow 180ms ease-in-out;
      }
      :host(:focus-visible) {
        box-shadow: 0 0 0 2px var(--control-slider-color);
      }
      :host([vertical]) {
        width: var(--control-slider-thickness);
        height: 100%;
      }
      .slider {
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: var(--control-slider-border-radius);
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
        background: var(--control-slider-background);
        opacity: var(--control-slider-background-opacity);
      }
      ::slotted([slot="background"]) {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
      }
      .slider .slider-track-bar {
        --border-radius: var(--control-slider-border-radius);
        --handle-size: 4px;
        --handle-margin: calc(var(--control-slider-thickness) / 8);
        --slider-size: 100%;
        position: absolute;
        height: 100%;
        width: 100%;
        background-color: var(--control-slider-color);
        transition:
          transform 180ms ease-in-out,
          background-color 180ms ease-in-out;
      }
      .slider .slider-track-bar.show-handle {
        --slider-size: calc(
          100% - 2 * var(--handle-margin) - var(--handle-size)
        );
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
        transform: translate3d(
          calc((var(--value, 0) - 1) * var(--slider-size)),
          0,
          0
        );
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
        transform: translate3d(
          calc(var(--value, 0) * var(--slider-size)),
          0,
          0
        );
        border-radius: var(--border-radius) 0 0 var(--border-radius);
      }
      .slider .slider-track-bar.end::after {
        right: initial;
        left: var(--handle-margin);
      }

      :host([vertical]) .slider .slider-track-bar {
        bottom: 0;
        left: 0;
        transform: translate3d(
          0,
          calc((1 - var(--value, 0)) * var(--slider-size)),
          0
        );
        border-radius: var(--border-radius) var(--border-radius) 0 0;
      }
      :host([vertical]) .slider .slider-track-bar:after {
        top: var(--handle-margin);
        right: 0;
        left: 0;
        bottom: initial;
        width: 50%;
        height: var(--handle-size);
      }
      :host([vertical]) .slider .slider-track-bar.end {
        top: 0;
        bottom: initial;
        transform: translate3d(
          0,
          calc((0 - var(--value, 0)) * var(--slider-size)),
          0
        );
        border-radius: 0 0 var(--border-radius) var(--border-radius);
      }
      :host([vertical]) .slider .slider-track-bar.end::after {
        top: initial;
        bottom: var(--handle-margin);
      }

      .slider .slider-track-cursor:after {
        display: block;
        content: "";
        background-color: var(--secondary-text-color);
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
        border-radius: var(--handle-size);
      }

      .slider .slider-track-cursor {
        --cursor-size: calc(var(--control-slider-thickness) / 4);
        --handle-size: 4px;
        position: absolute;
        background-color: white;
        border-radius: var(--handle-size);
        transition:
          left 180ms ease-in-out,
          bottom 180ms ease-in-out;
        top: 0;
        bottom: 0;
        left: calc(var(--value, 0) * (100% - var(--cursor-size)));
        width: var(--cursor-size);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }
      .slider .slider-track-cursor:after {
        height: 50%;
        width: var(--handle-size);
      }

      :host([vertical]) .slider .slider-track-cursor {
        top: initial;
        right: 0;
        left: 0;
        bottom: calc(var(--value, 0) * (100% - var(--cursor-size)));
        height: var(--cursor-size);
        width: 100%;
      }
      :host([vertical]) .slider .slider-track-cursor:after {
        height: var(--handle-size);
        width: 50%;
      }

      :host([pressed]) .slider-track-bar,
      :host([pressed]) .slider-track-cursor {
        transition: none;
      }
      :host(:disabled) .slider {
        cursor: not-allowed;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-slider": HaControlSlider;
  }
}

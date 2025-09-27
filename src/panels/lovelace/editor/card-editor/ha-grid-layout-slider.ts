import { DIRECTION_ALL, Manager, Pan, Tap } from "@egjs/hammerjs";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
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

type TooltipMode = "never" | "always" | "interaction";

@customElement("ha-grid-layout-slider")
export class HaGridLayoutSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ attribute: "touch-action" })
  public touchAction?: string;

  @property({ attribute: "tooltip-mode" })
  public tooltipMode: TooltipMode = "interaction";

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

  @state()
  public tooltipVisible = false;

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
        this._showTooltip();
        savedValue = this.value;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.pressed = false;
        this._hideTooltip();
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
        this._hideTooltip();
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

  private _handleKeyDown(e: KeyboardEvent) {
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

  private _handleKeyUp(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _tooltipTimeout?: number;

  private _showTooltip() {
    if (this._tooltipTimeout != null) window.clearTimeout(this._tooltipTimeout);
    this.tooltipVisible = true;
  }

  private _hideTooltip(delay?: number) {
    if (!delay) {
      this.tooltipVisible = false;
      return;
    }
    this._tooltipTimeout = window.setTimeout(() => {
      this.tooltipVisible = false;
    }, delay);
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

  private _renderTooltip() {
    if (this.tooltipMode === "never") return nothing;

    const position = this.vertical ? "left" : "top";

    const visible =
      this.tooltipMode === "always" ||
      (this.tooltipVisible && this.tooltipMode === "interaction");

    const value = this._boundedValue(this._steppedValue(this.value ?? 0));

    return html`
      <span
        aria-hidden="true"
        class="tooltip ${classMap({
          visible,
          [position]: true,
        })}"
      >
        ${value}
      </span>
    `;
  }

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

          ${Array(this._range / this.step)
            .fill(0)
            .map((_, i) => {
              const percentage = i / (this._range / this.step);
              const disabled =
                this.min >= i * this.step || i * this.step > this.max;
              if (disabled) {
                return nothing;
              }
              return html`
                <div
                  class="dot"
                  style=${styleMap({
                    "--value": `${percentage}`,
                  })}
                ></div>
              `;
            })}
          ${this.value !== undefined
            ? html`<div class="handle"></div>`
            : nothing}
          ${this._renderTooltip()}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --grid-layout-slider: 36px;
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
      user-select: none;
    }
    .track {
      position: absolute;
      inset: 0;
      margin: auto;
      height: 16px;
      width: 100%;
      border-radius: var(--ha-border-radius-md);
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
      opacity: 0.4;
    }
    .active {
      position: absolute;
      background: var(--primary-color);
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
    .dot {
      position: absolute;
      top: 0;
      bottom: 0;
      opacity: 0.6;
      margin: auto;
      width: 4px;
      height: 4px;
      flex-shrink: 0;
      transform: translate(-50%, 0);
      background: var(--card-background-color);
      left: calc(var(--value, 0%) * 100%);
      border-radius: 2px;
    }
    :host([vertical]) .dot {
      transform: translate(0, -50%);
      left: 0;
      right: 0;
      bottom: inherit;
      top: calc(var(--value, 0%) * 100%);
    }
    .handle::after {
      position: absolute;
      inset: 0;
      width: 4px;
      border-radius: 2px;
      height: 100%;
      margin: auto;
      background: var(--primary-color);
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

    .tooltip {
      position: absolute;
      background-color: var(--clear-background-color);
      color: var(--primary-text-color);
      font-size: var(--control-slider-tooltip-font-size);
      border-radius: var(--ha-border-radius-lg);
      padding: 0.2em 0.4em;
      opacity: 0;
      white-space: nowrap;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition:
        opacity 180ms ease-in-out,
        left 180ms ease-in-out,
        bottom 180ms ease-in-out;
      --handle-spacing: calc(2 * var(--handle-margin) + var(--handle-size));
      --slider-tooltip-margin: 0px;
      --slider-tooltip-range: 100%;
      --slider-tooltip-offset: 0px;
      --slider-tooltip-position: calc(
        min(
          max(
            var(--value) * var(--slider-tooltip-range) +
              var(--slider-tooltip-offset),
            0%
          ),
          100%
        )
      );
    }
    .tooltip.start {
      --slider-tooltip-offset: calc(-0.5 * (var(--handle-spacing)));
    }
    .tooltip.end {
      --slider-tooltip-offset: calc(0.5 * (var(--handle-spacing)));
    }
    .tooltip.cursor {
      --slider-tooltip-range: calc(100% - var(--handle-spacing));
      --slider-tooltip-offset: calc(0.5 * (var(--handle-spacing)));
    }
    .tooltip.show-handle {
      --slider-tooltip-range: calc(100% - var(--handle-spacing));
      --slider-tooltip-offset: calc(0.5 * (var(--handle-spacing)));
    }
    .tooltip.visible {
      opacity: 1;
    }
    .tooltip.top {
      transform: translate3d(-50%, -100%, 0);
      top: var(--slider-tooltip-margin);
      left: 50%;
    }
    .tooltip.bottom {
      transform: translate3d(-50%, 100%, 0);
      bottom: var(--slider-tooltip-margin);
      left: 50%;
    }
    .tooltip.left {
      transform: translate3d(-100%, -50%, 0);
      top: 50%;
      left: var(--slider-tooltip-margin);
    }
    .tooltip.right {
      transform: translate3d(100%, -50%, 0);
      top: 50%;
      right: var(--slider-tooltip-margin);
    }
    :host(:not([vertical])) .tooltip.top,
    :host(:not([vertical])) .tooltip.bottom {
      left: var(--slider-tooltip-position);
    }
    :host([vertical]) .tooltip.right,
    :host([vertical]) .tooltip.left {
      top: var(--slider-tooltip-position);
    }

    .pressed .handle {
      transition: none;
    }
    .pressed .tooltip {
      transition: opacity 180ms ease-in-out;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-layout-slider": HaGridLayoutSlider;
  }
}

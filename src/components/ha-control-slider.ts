import { DIRECTION_ALL, Manager, Pan, Press, Tap } from "@egjs/hammerjs";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { formatNumber } from "../common/number/format_number";
import { blankBeforeUnit } from "../common/translations/blank_before_unit";
import type { FrontendLocaleData } from "../data/translation";

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

type TooltipPosition = "top" | "bottom" | "left" | "right";

type TooltipMode = "never" | "always" | "interaction";

type SliderMode = "start" | "end" | "cursor";

@customElement("ha-control-slider")
export class HaControlSlider extends LitElement {
  @property({ attribute: false }) public locale?: FrontendLocaleData;

  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property()
  public mode?: SliderMode = "start";

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ type: Boolean, attribute: "show-handle" })
  public showHandle = false;

  @property({ type: Boolean, attribute: "inverted" })
  public inverted = false;

  @property({ attribute: "tooltip-position" })
  public tooltipPosition?: TooltipPosition;

  @property()
  public unit?: string;

  @property({ attribute: "tooltip-mode" })
  public tooltipMode: TooltipMode = "interaction";

  @property({ attribute: "touch-action" })
  public touchAction?: string;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property({ type: String })
  public label?: string;

  @state()
  public pressed = false;

  @state()
  public tooltipVisible = false;

  private _mc?: HammerManager;

  valueToPercentage(value: number) {
    const percentage =
      (this.boundedValue(value) - this.min) / (this.max - this.min);

    return this._isVisuallyInverted() ? 1 - percentage : percentage;
  }

  percentageToValue(percentage: number) {
    return (
      (this.max - this.min) *
        (this._isVisuallyInverted() ? 1 - percentage : percentage) +
      this.min
    );
  }

  steppedValue(value: number) {
    return Math.round(value / this.step) * this.step;
  }

  boundedValue(value: number) {
    return Math.min(Math.max(value, this.min), this.max);
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    this.setupListeners();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("value")) {
      const valuenow = this.steppedValue(this.value ?? 0);
      this.setAttribute("aria-valuenow", valuenow.toString());
      this.setAttribute("aria-valuetext", this._formatValue(valuenow));
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
      this._mc.add(new Press());

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
        this.value = this.percentageToValue(percentage);
        const value = this.steppedValue(this.value);
        fireEvent(this, "slider-moved", { value });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = false;
        this._hideTooltip();
        const percentage = this._getPercentageFromEvent(e);
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "slider-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this.value });
      });

      this._mc.on("singletap pressup", (e) => {
        if (this.disabled) return;
        const percentage = this._getPercentageFromEvent(e);
        this.value = this.steppedValue(this.percentageToValue(percentage));
        fireEvent(this, "value-changed", { value: this.value });
      });
    }
  }

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  private get _tenPercentStep() {
    return Math.max(this.step, (this.max - this.min) / 10);
  }

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

  private _handleKeyDown(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();

    if (e.code === "Home") {
      this.value = this.min;
    } else if (e.code === "End") {
      this.value = this.max;
    } else if (e.code === "PageUp") {
      this.value = this.steppedValue(
        this.boundedValue((this.value ?? 0) + this._tenPercentStep)
      );
    } else if (e.code === "PageDown") {
      this.value = this.steppedValue(
        this.boundedValue((this.value ?? 0) - this._tenPercentStep)
      );
    } else {
      const isRtl = mainWindow.document.dir === "rtl";
      let multiplier = 1;
      switch (e.code) {
        case "ArrowRight":
          multiplier = isRtl ? -1 : 1;
          break;
        case "ArrowUp":
          multiplier = 1;
          break;
        case "ArrowLeft":
          multiplier = isRtl ? 1 : -1;
          break;
        case "ArrowDown":
          multiplier = -1;
          break;
      }

      this.value = this.boundedValue(
        (this.value ?? 0) + this.step * multiplier
      );
    }
    this._showTooltip();
    fireEvent(this, "slider-moved", { value: this.value });
  }

  private _tooltipTimeout?: number;

  private _handleKeyUp(e: KeyboardEvent) {
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    this._hideTooltip(500);
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

  private _formatValue(value: number) {
    const formattedValue = formatNumber(value, this.locale);

    const formattedUnit = this.unit
      ? `${blankBeforeUnit(this.unit, this.locale)}${this.unit}`
      : "";

    return `${formattedValue}${formattedUnit}`;
  }

  private _renderTooltip() {
    if (this.tooltipMode === "never") return nothing;

    const position = this.tooltipPosition ?? (this.vertical ? "left" : "top");

    const visible =
      this.tooltipMode === "always" ||
      (this.tooltipVisible && this.tooltipMode === "interaction");

    const value = this.steppedValue(this.value ?? 0);

    return html`
      <span
        aria-hidden="true"
        class="tooltip ${classMap({
          visible,
          [position]: true,
          [this.mode ?? "start"]: true,
          "show-handle": this.showHandle,
        })}"
      >
        ${this._formatValue(value)}
      </span>
    `;
  }

  protected render(): TemplateResult {
    const valuenow = this.steppedValue(this.value ?? 0);
    return html`
      <div
        class="container${classMap({
          pressed: this.pressed,
        })}"
        style=${styleMap({
          "--value": `${this.valueToPercentage(this.value ?? 0)}`,
        })}
      >
        <div
          id="slider"
          class="slider"
          role="slider"
          tabindex="0"
          aria-label=${ifDefined(this.label)}
          aria-valuenow=${valuenow.toString()}
          aria-valuetext=${this._formatValue(valuenow)}
          aria-valuemin=${ifDefined(
            this.min != null ? this.min.toString() : undefined
          )}
          aria-valuemax=${ifDefined(
            this.max != null ? this.max.toString() : undefined
          )}
          aria-orientation=${this.vertical ? "vertical" : "horizontal"}
          @keydown=${this._handleKeyDown}
          @keyup=${this._handleKeyUp}
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
        ${this._renderTooltip()}
      </div>
    `;
  }

  private _isVisuallyInverted() {
    let inverted = this.inverted;

    if (mainWindow.document.dir === "rtl") {
      inverted = !inverted;
    }

    return inverted;
  }

  static styles = css`
    :host {
      display: block;
      --control-slider-color: var(--primary-color);
      --control-slider-background: var(--disabled-color);
      --control-slider-background-opacity: 0.2;
      --control-slider-thickness: 40px;
      --control-slider-border-radius: var(--ha-border-radius-md);
      --control-slider-tooltip-font-size: var(--ha-font-size-m);
      height: var(--control-slider-thickness);
      width: 100%;
    }
    :host([vertical]) {
      width: var(--control-slider-thickness);
      height: 100%;
    }
    .container {
      position: relative;
      height: 100%;
      width: 100%;
      --handle-size: 4px;
      --handle-margin: calc(var(--control-slider-thickness) / 8);
    }
    .tooltip {
      pointer-events: none;
      user-select: none;
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
      --slider-tooltip-margin: -4px;
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
    .tooltip:dir(ltr).start,
    .tooltip:dir(rtl).end {
      --slider-tooltip-offset: calc(-0.5 * (var(--handle-spacing)));
    }
    .tooltip:dir(ltr).end,
    .tooltip:dir(rtl).start {
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
      transform: translate3d(-100%, 50%, 0);
      bottom: 50%;
      left: var(--slider-tooltip-margin);
    }
    .tooltip.right {
      transform: translate3d(100%, 50%, 0);
      bottom: 50%;
      right: var(--slider-tooltip-margin);
    }
    :host(:not([vertical])) .tooltip.top,
    :host(:not([vertical])) .tooltip.bottom {
      left: var(--slider-tooltip-position);
    }
    :host([vertical]) .tooltip.right,
    :host([vertical]) .tooltip.left {
      bottom: var(--slider-tooltip-position);
    }
    .slider {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: var(--control-slider-border-radius);
      transform: translateZ(0);
      transition: box-shadow 180ms ease-in-out;
      outline: none;
      overflow: hidden;
      cursor: pointer;
    }
    .slider:focus-visible {
      box-shadow: 0 0 0 2px var(--control-slider-color);
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
      --ha-border-radius: var(--control-slider-border-radius);
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
      --slider-size: calc(100% - 2 * var(--handle-margin) - var(--handle-size));
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
      --slider-track-bar-border-radius: min(
        var(--control-slider-border-radius),
        var(--ha-border-radius-md)
      );
      top: 0;
      left: 0;
      transform: translate3d(
        calc((var(--value, 0) - 1) * var(--slider-size)),
        0,
        0
      );
      border-radius: var(--slider-track-bar-border-radius);
    }
    .slider .slider-track-bar:after {
      top: 0;
      bottom: 0;
      right: var(--handle-margin);
      height: 50%;
      width: var(--handle-size);
    }
    .slider:dir(ltr) .slider-track-bar.end,
    .slider:dir(rtl) .slider-track-bar {
      right: 0;
      left: initial;
      transform: translate3d(calc(var(--value, 0) * var(--slider-size)), 0, 0);
    }
    .slider:dir(ltr) .slider-track-bar.end::after,
    .slider:dir(rtl) .slider-track-bar::after {
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
      position: absolute;
      background-color: white;
      border-radius: min(
        var(--handle-size),
        var(--control-slider-border-radius)
      );
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
    .pressed .tooltip {
      transition: opacity 180ms ease-in-out;
    }
    .pressed .slider-track-bar,
    .pressed .slider-track-cursor {
      transition: none;
    }
    :host(:disabled) .slider {
      cursor: not-allowed;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-slider": HaControlSlider;
  }
}

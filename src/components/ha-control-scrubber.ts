import { DIRECTION_HORIZONTAL, Manager, Pan, Press, Tap } from "@egjs/hammerjs";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
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

@customElement("ha-control-scrubber")
export class HaControlScrubber extends LitElement {
  @property({ attribute: false }) public locale?: FrontendLocaleData;

  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true })
  public wrap = false;

  @property({ attribute: "touch-action" })
  public touchAction?: string;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Boolean, attribute: "round-value" })
  public roundValue = false;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property({ type: String })
  public label?: string;

  @property({ type: String })
  public unit?: string;

  @state()
  public pressed = false;

  private _mc?: HammerManager;

  private get _range() {
    return this.max - this.min;
  }

  valueToPercentage(value: number) {
    return (this.normalizedValue(value) - this.min) / this._range;
  }

  normalizedValue(value: number) {
    if (!this.wrap) {
      return Math.min(Math.max(value, this.min), this.max);
    }
    const offset = (value - this.min) % this._range;
    return (offset < 0 ? offset + this._range : offset) + this.min;
  }

  steppedValue(value: number) {
    return this.normalizedValue(Math.round(value / this.step) * this.step);
  }

  private _displayedValue(value: number) {
    const stepped = this.steppedValue(value);
    return this.roundValue ? Math.round(stepped) : stepped;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    this.setupListeners();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("value") || changedProps.has("roundValue")) {
      const valuenow = this._displayedValue(this.value ?? this.min);
      this.setAttribute("aria-valuenow", valuenow.toString());
      this.setAttribute("aria-valuetext", this._formatValue(valuenow));
    }
    if (changedProps.has("min")) {
      this.setAttribute("aria-valuemin", this.min.toString());
    }
    if (changedProps.has("max")) {
      this.setAttribute("aria-valuemax", this.max.toString());
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

  @query("#scrubber")
  private _scrubber?: HTMLElement;

  @query(".track")
  private _track?: HTMLElement;

  setupListeners() {
    if (this._scrubber && !this._mc) {
      this._mc = new Manager(this._scrubber, {
        touchAction: this.touchAction ?? "pan-y",
      });
      this._mc.add(
        new Pan({
          threshold: 10,
          direction: DIRECTION_HORIZONTAL,
          enable: true,
        })
      );
      this._mc.add(new Tap({ event: "singletap" }));
      this._mc.add(new Press());

      let savedValue: number | undefined;
      this._mc.on("panstart", () => {
        if (this.disabled) return;
        this.pressed = true;
        savedValue = this.value ?? this.min;
      });
      this._mc.on("pancancel", () => {
        if (this.disabled) return;
        this.pressed = false;
        this.value = savedValue;
        fireEvent(this, "slider-moved", { value: undefined });
      });
      this._mc.on("panmove", (e) => {
        if (this.disabled) return;
        this.value = this.normalizedValue(
          savedValue! + this._deltaToValue(e.deltaX)
        );
        fireEvent(this, "slider-moved", {
          value: this.steppedValue(this.value),
        });
      });
      this._mc.on("panend", (e) => {
        if (this.disabled) return;
        this.pressed = false;
        this.value = this.steppedValue(
          savedValue! + this._deltaToValue(e.deltaX)
        );
        fireEvent(this, "slider-moved", { value: undefined });
        fireEvent(this, "value-changed", { value: this.value });
      });

      this._mc.on("singletap pressup", (e) => {
        if (this.disabled) return;
        const rect = this._scrubber!.getBoundingClientRect();
        const offset = e.center.x - (rect.left + rect.width / 2);
        this.value = this.steppedValue(
          (this.value ?? this.min) - this._deltaToValue(offset)
        );
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

  private _deltaToValue(deltaX: number) {
    const trackWidth = this._track!.clientWidth / (this.wrap ? 3 : 1);
    return (-deltaX * this._range) / trackWidth;
  }

  private get _tenPercentStep() {
    return Math.max(this.step, this._range / 10);
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (this.disabled || !A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();

    const current = this.value ?? this.min;
    if (e.code === "Home") {
      this.value = this.min;
    } else if (e.code === "End") {
      this.value = this.max;
    } else if (e.code === "PageUp") {
      this.value = this.steppedValue(current + this._tenPercentStep);
    } else if (e.code === "PageDown") {
      this.value = this.steppedValue(current - this._tenPercentStep);
    } else {
      const multiplier =
        e.code === "ArrowLeft" || e.code === "ArrowDown" ? -1 : 1;
      this.value = this.normalizedValue(current + this.step * multiplier);
    }
    fireEvent(this, "slider-moved", { value: this.value });
  }

  private _handleKeyUp(e: KeyboardEvent) {
    if (this.disabled || !A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    fireEvent(this, "slider-moved", { value: undefined });
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _formatValue(value: number) {
    const formattedValue = formatNumber(value, this.locale);

    const formattedUnit = this.unit
      ? `${blankBeforeUnit(this.unit, this.locale)}${this.unit}`
      : "";

    return `${formattedValue}${formattedUnit}`;
  }

  protected render(): TemplateResult {
    const valuenow = this._displayedValue(this.value ?? this.min);
    return html`
      <div
        class="container ${classMap({ pressed: this.pressed, wrap: this.wrap })}"
        style=${styleMap({
          "--value": `${this.valueToPercentage(this.value ?? this.min)}`,
        })}
      >
        <div
          id="scrubber"
          class="scrubber"
          role="slider"
          tabindex="0"
          aria-disabled=${this.disabled}
          aria-label=${ifDefined(this.label)}
          aria-valuenow=${valuenow.toString()}
          aria-valuetext=${this._formatValue(valuenow)}
          aria-valuemin=${this.min.toString()}
          aria-valuemax=${this.max.toString()}
          aria-orientation="horizontal"
          @keydown=${this._handleKeyDown}
          @keyup=${this._handleKeyUp}
        >
          <div class="rail"></div>
          <div class="track"></div>
          <div class="window"></div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --control-scrubber-color: var(--primary-color);
      --control-scrubber-background: var(--disabled-color);
      --control-scrubber-rail-color: var(--disabled-color);
      --control-scrubber-rail-opacity: 0.2;
      --control-scrubber-thickness: 40px;
      --control-scrubber-border-radius: var(--ha-border-radius-md);
      --control-scrubber-track-width: 100%;
      --control-scrubber-inset-shadow: none;
      height: var(--control-scrubber-thickness);
      width: 100%;
    }
    .container {
      position: relative;
      height: 100%;
      width: 100%;
      --window-width: calc(var(--control-scrubber-thickness) / 2.5);
      --track-width: max(var(--control-scrubber-track-width), 100%);
    }
    .scrubber {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: var(--control-scrubber-border-radius);
      transform: translateZ(0);
      transition: box-shadow 180ms ease-in-out;
      outline: none;
      overflow: hidden;
      cursor: grab;
    }
    .pressed .scrubber {
      cursor: grabbing;
    }
    .scrubber:focus-visible {
      box-shadow: 0 0 0 2px var(--control-scrubber-color);
    }
    .scrubber * {
      pointer-events: none;
    }
    .scrubber::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-shadow: var(--control-scrubber-inset-shadow);
      pointer-events: none;
    }
    .rail {
      position: absolute;
      inset: 0;
      background: var(--control-scrubber-rail-color);
      opacity: var(--control-scrubber-rail-opacity);
    }
    .track {
      position: absolute;
      top: 0;
      height: 100%;
      left: 50%;
      width: var(--track-width);
      background: var(--control-scrubber-background);
      transform: translate3d(calc(var(--value, 0) * -100%), 0, 0);
      transition: transform 180ms ease-in-out;
    }
    .wrap .track {
      width: calc(3 * var(--track-width));
      background-size: calc(100% / 3) 100%;
      background-repeat: repeat-x;
      transform: translate3d(calc((1 + var(--value, 0)) * -100% / 3), 0, 0);
    }
    .pressed .track {
      transition: none;
    }
    .window {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: var(--window-width);
      transform: translateX(-50%);
      box-sizing: border-box;
      border: 2px solid white;
      border-radius: min(
        var(--control-scrubber-border-radius),
        var(--ha-border-radius-md)
      );
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 1px 3px rgba(0, 0, 0, 0.15);
    }
    :host([disabled]) .scrubber {
      cursor: not-allowed;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-scrubber": HaControlScrubber;
  }
}

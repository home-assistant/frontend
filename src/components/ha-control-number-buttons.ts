import { mdiMinus, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { conditionalClamp } from "../common/number/clamp";
import { formatNumber } from "../common/number/format_number";
import { FrontendLocaleData } from "../data/translation";
import { fireEvent } from "../common/dom/fire_event";

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

@customElement("ha-control-number-buttons")
export class HaControlNumberButton extends LitElement {
  @property({ attribute: false }) public locale?: FrontendLocaleData;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property() public label?: string;

  @property({ type: Number }) public step?: number;

  @property({ type: Number }) public value?: number;

  @property({ type: Number }) public min?: number;

  @property({ type: Number }) public max?: number;

  @property({ attribute: "false" })
  public formatOptions: Intl.NumberFormatOptions = {};

  @query("#input") _input!: HTMLDivElement;

  private boundedValue(value: number) {
    const clamped = conditionalClamp(value, this.min, this.max);
    return Math.round(clamped / this._step) * this._step;
  }

  private get _step() {
    return this.step ?? 1;
  }

  private get _value() {
    return this.value ?? 0;
  }

  private get _tenPercentStep() {
    if (this.max == null || this.min == null) return this._step;
    const range = this.max - this.min / 10;

    if (range <= this._step) return this._step;
    return Math.max(range / 10);
  }

  private _handlePlusButton() {
    this._increment();
    fireEvent(this, "value-changed", { value: this.value });
    this._input.focus();
  }

  private _handleMinusButton() {
    this._decrement();
    fireEvent(this, "value-changed", { value: this.value });
    this._input.focus();
  }

  private _increment() {
    this.value = this.boundedValue(this._value + this._step);
  }

  private _decrement() {
    this.value = this.boundedValue(this._value - this._step);
  }

  _handleKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;
    if (!A11Y_KEY_CODES.has(e.code)) return;
    e.preventDefault();
    switch (e.code) {
      case "ArrowRight":
      case "ArrowUp":
        this._increment();
        break;
      case "ArrowLeft":
      case "ArrowDown":
        this._decrement();
        break;
      case "PageUp":
        this.value = this.boundedValue(this._value + this._tenPercentStep);
        break;
      case "PageDown":
        this.value = this.boundedValue(this._value - this._tenPercentStep);
        break;
      case "Home":
        if (this.min != null) {
          this.value = this.min;
        }
        break;
      case "End":
        if (this.max != null) {
          this.value = this.max;
        }
        break;
    }
    fireEvent(this, "value-changed", { value: this.value });
  }

  protected render(): TemplateResult {
    const displayedValue =
      this.value != null
        ? formatNumber(this.value, this.locale, this.formatOptions)
        : "";

    return html`
      <div class="container">
        <div
          id="input"
          class="value"
          role="number-button"
          .tabIndex=${this.disabled ? "-1" : "0"}
          aria-valuenow=${this.value}
          aria-valuemin=${this.min}
          aria-valuemax=${this.max}
          aria-label=${ifDefined(this.label)}
          ?disabled=${this.disabled}
          @keydown=${this._handleKeyDown}
        >
          ${displayedValue}
        </div>
        <button
          class="button minus"
          type="button"
          tabindex="-1"
          aria-label="decrement"
          @click=${this._handleMinusButton}
          .disabled=${this.disabled ||
          (this.min != null && this._value <= this.min)}
        >
          <ha-svg-icon aria-hidden .path=${mdiMinus}></ha-svg-icon>
        </button>
        <button
          class="button plus"
          type="button"
          tabindex="-1"
          aria-label="increment"
          @click=${this._handlePlusButton}
          .disabled=${this.disabled ||
          (this.max != null && this._value >= this.max)}
        >
          <ha-svg-icon aria-hidden .path=${mdiPlus}></ha-svg-icon>
        </button>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --control-number-buttons-focus-color: var(--primary-color);
        --control-number-buttons-background-color: var(--disabled-color);
        --control-number-buttons-background-opacity: 0.2;
        --control-number-buttons-border-radius: 10px;
        --mdc-icon-size: 16px;
        height: 40px;
        width: 200px;
        color: var(--primary-text-color);
        -webkit-tap-highlight-color: transparent;
        font-style: normal;
        font-weight: 500;
        transition: color 180ms ease-in-out;
      }
      :host([disabled]) {
        color: var(--disabled-color);
      }
      .container {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .value {
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        width: 100%;
        height: 100%;
        padding: 0 44px;
        border-radius: var(--control-number-buttons-border-radius);
        padding: 0;
        margin: 0;
        box-sizing: border-box;
        line-height: 0;
        overflow: hidden;
        /* For safari border-radius overflow */
        z-index: 0;
        font-size: inherit;
        color: inherit;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;
      }
      .value::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-color: var(--control-number-buttons-background-color);
        transition:
          background-color 180ms ease-in-out,
          opacity 180ms ease-in-out;
        opacity: var(--control-number-buttons-background-opacity);
      }
      .value:focus-visible {
        box-shadow: 0 0 0 2px var(--control-number-buttons-focus-color);
      }
      .button {
        color: inherit;
        position: absolute;
        top: 0;
        bottom: 0;
        padding: 0;
        width: 35px;
        height: 40px;
        border: none;
        background: none;
        cursor: pointer;
        outline: none;
      }
      .button[disabled] {
        opacity: 0.4;
        pointer-events: none;
        cursor: not-allowed;
      }
      .button.minus {
        left: 0;
      }
      .button.plus {
        right: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-number-buttons": HaControlNumberButton;
  }
}

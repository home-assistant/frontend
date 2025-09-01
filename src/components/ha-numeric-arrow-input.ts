import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiArrowDown, mdiArrowUp } from "@mdi/js";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon-button";
import "./ha-textfield";
import memoizeOne from "memoize-one";

@customElement("ha-numeric-arrow-input")
export class HaNumericArrowInput extends LitElement {
  @property({ attribute: false }) public disabled = false;

  @property({ attribute: false }) public required = false;

  @property({ attribute: false }) public min?: number;

  @property({ attribute: false }) public max?: number;

  @property({ attribute: false }) public step?: number;

  @property({ attribute: false }) public labelUp?: string;

  @property({ attribute: false }) public labelDown?: string;

  @property({ attribute: false }) public padStart?: number;

  @property({ attribute: false }) public value = 0;

  private _paddedValue = memoizeOne((value: number, padStart?: number) =>
    value.toString().padStart(padStart ?? 0, "0")
  );

  render() {
    return html`<div
      class="numeric-arrow-input-container"
      @keydown=${this._keyDown}
    >
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.labelUp ?? ""}
        .path=${mdiArrowUp}
        @click=${this._up}
      ></ha-icon-button>
      <span class="numeric-arrow-input-value"
        >${this._paddedValue(this.value, this.padStart)}</span
      >
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.labelDown ?? ""}
        .path=${mdiArrowDown}
        @click=${this._down}
      ></ha-icon-button>
    </div>`;
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("value")) {
      fireEvent(this, "value-changed", { value: this.value });
    }
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "ArrowUp") {
      this._up();
    }
    if (ev.key === "ArrowDown") {
      this._down();
    }
  }

  private _up() {
    const newValue = this.value + (this.step ?? 1);
    fireEvent(this, "value-changed", { value: this._clampValue(newValue) });
  }

  private _down() {
    const newValue = this.value - (this.step ?? 1);
    fireEvent(this, "value-changed", { value: this._clampValue(newValue) });
  }

  private _clampValue(value: number) {
    if (this.max && value > this.max) {
      return this.max;
    }
    if (this.min && value < this.min) {
      return this.min;
    }
    return value;
  }

  static styles = css`
    .numeric-arrow-input-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .numeric-arrow-input-container ha-icon-button {
      --mdc-icon-button-size: 24px;
      color: var(--secondary-text-color);
    }

    .numeric-arrow-input-value {
      color: var(--primary-text-color);
      font-size: 16px;
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-numeric-arrow-input": HaNumericArrowInput;
  }
}

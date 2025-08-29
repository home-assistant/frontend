import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiArrowDown, mdiArrowUp } from "@mdi/js";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon-button";
import "./ha-textfield";

@customElement("ha-numeric-arrow-input")
export class HaNumericArrowInput extends LitElement {
  @property({ attribute: false }) public disabled = false;

  @property({ attribute: false }) public required = false;

  @property({ attribute: false }) public min?: number;

  @property({ attribute: false }) public max?: number;

  @property({ attribute: false }) public step?: number;

  @property({ attribute: false }) public value = 0;

  @property({ attribute: false }) public labelUp?: string;

  @property({ attribute: false }) public labelDown?: string;

  @state() private _value = 0;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._value = this.value ?? 0;
  }

  render() {
    return html`<div
      class="numeric-arrow-input-container"
      @keydown=${this._keyDown}
    >
      <ha-icon-button
        .label=${this.labelUp ?? ""}
        .path=${mdiArrowUp}
        @click=${this._up}
      ></ha-icon-button>
      ${this._value}
      <ha-icon-button
        .label=${this.labelDown ?? ""}
        .path=${mdiArrowDown}
        @click=${this._down}
      ></ha-icon-button>
    </div>`;
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("value")) {
      fireEvent(this, "value-changed", { value: this._value });
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
    this._value += this.step ?? 1;
  }

  private _down() {
    this._value -= this.step ?? 1;
  }

  static styles = css`
    .numeric-arrow-input-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 24px;
      height: 24px;
      border: 1px solid var(--ha-border-color);
      border-radius: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-numeric-arrow-input": HaNumericArrowInput;
  }
}

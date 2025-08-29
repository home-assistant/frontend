import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
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

  @property({ attribute: false }) public value?: number;

  render() {
    return html`<div class="container">
      <ha-icon-button icon="mdi:arrow-up"></ha-icon-button>
      <ha-textfield
        .disabled=${this.disabled}
        .required=${this.required}
        .value=${String(this.value ?? 0)}
        @change=${this._valueChanged}
        @keydown=${this._keyDown}
      ></ha-textfield>
      <ha-icon-button icon="mdi:arrow-down"></ha-icon-button>
    </div>`;
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "ArrowUp") {
      this._valueChanged(ev);
    }
    if (ev.key === "ArrowDown") {
      this._valueChanged(ev);
    }
  }

  private _valueChanged(ev: Event) {
    const value = (ev.target as HTMLInputElement).value;
    this.value = Number(value) + (this.step ?? 1);
    fireEvent(this, "value-changed", { value: this.value });
  }

  static styles = css`
    .container {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-numeric-arrow-input": HaNumericArrowInput;
  }
}

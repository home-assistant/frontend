import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { mdiMinus, mdiPlus } from "@mdi/js";
import { fireEvent } from "../common/dom/fire_event";
import type { HaIconButton } from "./ha-icon-button";
import "./ha-textfield";
import "./ha-icon-button";
import { clampValue } from "../data/number";

@customElement("ha-numeric-arrow-input")
export class HaNumericArrowInput extends LitElement {
  @property({ attribute: false }) public disabled = false;

  @property({ attribute: false }) public required = false;

  @property({ attribute: false }) public min?: number;

  @property({ attribute: false }) public max?: number;

  @property({ attribute: false }) public step?: number;

  @property({ attribute: false }) public padStart?: number;

  @property({ attribute: false }) public labelUp = "Increase";

  @property({ attribute: false }) public labelDown = "Decrease";

  @property({ attribute: false }) public value = 0;

  @query("ha-icon-button[data-direction='up']")
  private _upButton!: HaIconButton;

  @query("ha-icon-button[data-direction='down']")
  private _downButton!: HaIconButton;

  private _paddedValue = memoizeOne((value: number, padStart?: number) =>
    value.toString().padStart(padStart ?? 0, "0")
  );

  render() {
    return html`<div
      class="numeric-arrow-input-container"
      @keydown=${this._keyDown}
    >
      <ha-icon-button
        data-direction="up"
        .disabled=${this.disabled}
        .label=${this.labelUp}
        .path=${mdiPlus}
        @click=${this._up}
      ></ha-icon-button>
      <span class="numeric-arrow-input-value"
        >${this._paddedValue(this.value, this.padStart)}</span
      >
      <ha-icon-button
        data-direction="down"
        .disabled=${this.disabled}
        .label=${this.labelDown}
        .path=${mdiMinus}
        @click=${this._down}
      ></ha-icon-button>
    </div>`;
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "ArrowUp") {
      this._upButton.focus();
      this._up();
    }
    if (ev.key === "ArrowDown") {
      this._downButton.focus();
      this._down();
    }
  }

  private _up() {
    const newValue = this.value + (this.step ?? 1);
    fireEvent(
      this,
      "value-changed",
      clampValue({ value: newValue, min: this.min, max: this.max })
    );
  }

  private _down() {
    const newValue = this.value - (this.step ?? 1);
    fireEvent(
      this,
      "value-changed",
      clampValue({ value: newValue, min: this.min, max: this.max })
    );
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

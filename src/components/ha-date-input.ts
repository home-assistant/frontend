import {
  html,
  css,
  LitElement,
  TemplateResult,
  property,
  customElement,
} from "lit-element";

import "@polymer/paper-input/paper-input";
// tslint:disable-next-line:no-duplicate-imports
import { PaperInputElement } from "@polymer/paper-input/paper-input";

@customElement("ha-date-input")
export class HaDateInput extends LitElement {
  @property() public year?: string;
  @property() public month?: string;
  @property() public day?: string;
  @property({ type: Boolean }) public disabled = false;

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--paper-font-common-base_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-common-base_-_-webkit-font-smoothing
        );
      }

      paper-input {
        width: 30px;
        text-align: center;
        --paper-input-container-shared-input-style_-_-webkit-appearance: textfield;
        --paper-input-container-input_-_-moz-appearance: textfield;
        --paper-input-container-shared-input-style_-_appearance: textfield;
        --paper-input-container-input-webkit-spinner_-_-webkit-appearance: none;
        --paper-input-container-input-webkit-spinner_-_margin: 0;
        --paper-input-container-input-webkit-spinner_-_display: none;
      }

      paper-input#year {
        width: 50px;
      }

      .date-input-wrap {
        display: flex;
        flex-direction: row;
      }
    `;
  }

  protected render(): TemplateResult {
    return html`
      <div class="date-input-wrap">
        <paper-input
          id="year"
          type="number"
          .value=${this.year}
          @change=${this._formatYear}
          maxlength="4"
          max="9999"
          min="0"
          .disabled=${this.disabled}
          no-label-float
        >
          <span suffix="" slot="suffix">-</span>
        </paper-input>
        <paper-input
          id="month"
          type="number"
          .value=${this.month}
          @change=${this._formatMonth}
          maxlength="2"
          max="12"
          min="1"
          .disabled=${this.disabled}
          no-label-float
        >
          <span suffix="" slot="suffix">-</span>
        </paper-input>
        <paper-input
          id="day"
          type="number"
          .value=${this.day}
          @change=${this._formatDay}
          maxlength="2"
          max="31"
          min="1"
          .disabled=${this.disabled}
          no-label-float
        >
        </paper-input>
      </div>
    `;
  }

  private _formatYear() {
    const yearElement = this.shadowRoot!.getElementById(
      "year"
    ) as PaperInputElement;
    this.year = yearElement.value!;
  }

  private _formatMonth() {
    const monthElement = this.shadowRoot!.getElementById(
      "month"
    ) as PaperInputElement;
    this.month = ("0" + monthElement.value!).slice(-2);
  }

  private _formatDay() {
    const dayElement = this.shadowRoot!.getElementById(
      "day"
    ) as PaperInputElement;
    this.day = ("0" + dayElement.value!).slice(-2);
  }

  get value() {
    return `${this.year}-${this.month}-${this.day}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-input": HaDateInput;
  }
}

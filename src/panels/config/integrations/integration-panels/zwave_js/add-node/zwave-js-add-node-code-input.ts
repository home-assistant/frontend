import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

import { fireEvent } from "../../../../../../common/dom/fire_event";
import type { HaInput } from "../../../../../../components/input/ha-input";

import "../../../../../../components/ha-alert";
import "../../../../../../components/input/ha-input";

@customElement("zwave-js-add-node-code-input")
export class ZWaveJsAddNodeCodeInput extends LitElement {
  @property() public value = "";

  @property() public description = "";

  @property() public placeholder = "";

  @property({ attribute: "reference-key" }) public referenceKey = "";

  @property() public error?: string;

  @property({ type: Boolean }) public numeric = false;

  render() {
    return html`
      <p>${this.description}</p>
      ${this.error
        ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
        : nothing}
      <ha-input
        .placeholder=${this.placeholder}
        .value=${this.value}
        @input=${this._handleChange}
        @keyup=${this._handleKeyup}
        required
        autofocus
      ></ha-input>
      ${this.referenceKey
        ? html`<div>
            <span>${this.value.padEnd(5, "·")}</span>${this.referenceKey}
          </div> `
        : nothing}
    `;
  }

  private _handleKeyup(ev: KeyboardEvent): void {
    if (ev.key === "Enter" && this.value) {
      fireEvent(this, "z-wave-submit");
    }
  }

  private _handleChange(ev: InputEvent): void {
    const inputElement = ev.target as HaInput;
    if (
      this.numeric &&
      (isNaN(Number(inputElement.value)) || inputElement.value!.length > 5)
    ) {
      inputElement.value = this.value;
      return;
    }

    this.value = (ev.target as HaInput).value ?? "";

    fireEvent(this, "value-changed", {
      value: (ev.target as HaInput).value,
    });
  }

  static styles = css`
    ha-input {
      width: 100%;
    }
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    p {
      color: var(--secondary-text-color);
      margin-top: 0;
      margin-bottom: 16px;
    }
    div {
      font-family: var(--ha-font-family-code);
      margin-top: 16px;
    }
    div span {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-code-input": ZWaveJsAddNodeCodeInput;
  }
  interface HASSDomEvents {
    "z-wave-submit";
  }
}

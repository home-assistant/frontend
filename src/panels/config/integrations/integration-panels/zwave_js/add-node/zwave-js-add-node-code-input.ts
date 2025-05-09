import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";

import { fireEvent } from "../../../../../../common/dom/fire_event";
import type { HaTextField } from "../../../../../../components/ha-textfield";

import "../../../../../../components/ha-textfield";
import "../../../../../../components/ha-alert";

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
      <ha-textfield
        .placeholder=${this.placeholder}
        .value=${this.value}
        @input=${this._handleChange}
        @keyup=${this._handleKeyup}
        required
        autofocus
      ></ha-textfield>
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
    const inputElement = ev.target as HaTextField;
    if (
      this.numeric &&
      (isNaN(Number(inputElement.value)) || inputElement.value.length > 5)
    ) {
      inputElement.value = this.value;
      return;
    }

    this.value = (ev.target as HaTextField).value;

    fireEvent(this, "value-changed", {
      value: (ev.target as HaTextField).value,
    });
  }

  static styles = css`
    ha-textfield {
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

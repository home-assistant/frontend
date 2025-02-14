import { customElement, property, state } from "lit/decorators";
import {
  type PropertyValues,
  css,
  type CSSResultGroup,
  html,
  LitElement,
  nothing,
} from "lit";
import { mdiContentCopy, mdiEye, mdiEyeOff } from "@mdi/js";
import { haStyle } from "../resources/styles";

import "./ha-button";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-textfield";
import type { HomeAssistant } from "../types";
import { copyToClipboard } from "../common/util/copy-clipboard";
import { showToast } from "../util/toast";
import type { HaTextField } from "./ha-textfield";

@customElement("ha-copy-textfield")
export class HaCopyTextfield extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "value" }) public value!: string;

  @property({ attribute: "masked_value" }) public maskedValue?: string;

  @property({ attribute: "label" }) public label?: string;

  @state() private _showMasked = false;

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    if (this.maskedValue) {
      this._showMasked = true;
    }
  }

  public render() {
    return html`
      <div class="container">
        <div class="textfield-container">
          <ha-textfield
            .value=${this._showMasked && this.maskedValue
              ? this.maskedValue
              : this.value}
            readonly
            .suffix=${this.maskedValue
              ? html`<div style="width: 24px"></div>`
              : nothing}
            @click=${this._focusInput}
          ></ha-textfield>
          ${this.maskedValue
            ? html`<ha-icon-button
                class="toggle-unmasked"
                toggles
                .label=${this.hass.localize(
                  `ui.common.${this._showMasked ? "show" : "hide"}`
                )}
                @click=${this._toggleMasked}
                .path=${this._showMasked ? mdiEye : mdiEyeOff}
              ></ha-icon-button>`
            : nothing}
        </div>
        <ha-button @click=${this._copy} unelevated>
          <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
          ${this.label || this.hass.localize("ui.common.copy")}
        </ha-button>
      </div>
    `;
  }

  private _focusInput(ev) {
    const inputElement = ev.currentTarget as HaTextField;
    inputElement.select();
  }

  private _toggleMasked(): void {
    this._showMasked = !this._showMasked;
  }

  private async _copy(): Promise<void> {
    await copyToClipboard(this.value);
    showToast(this, {
      message: this.hass!.localize("ui.common.copied_clipboard"),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .textfield-container {
          position: relative;
          flex: 1;
        }

        .textfield-container ha-textfield {
          display: block;
        }

        .toggle-unmasked {
          position: absolute;
          top: 8px;
          right: 8px;
          inset-inline-start: initial;
          inset-inline-end: 8px;
          --mdc-icon-button-size: 40px;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
          direction: var(--direction);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-copy-textfield": HaCopyTextfield;
  }
}

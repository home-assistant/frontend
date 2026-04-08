import { consume, type ContextType } from "@lit/context";
import { mdiContentCopy, mdiEye, mdiEyeOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { copyToClipboard } from "../../common/util/copy-clipboard";
import { internationalizationContext } from "../../data/context/context";
import { showToast } from "../../util/toast";
import "../ha-button";
import "../ha-icon-button";
import "../ha-svg-icon";
import "./ha-input";
import type { HaInput, InputType } from "./ha-input";

/**
 * Home Assistant input with copy button
 *
 * @element ha-input-copy
 * @extends {LitElement}
 *
 * @summary
 * A read-only input component with a copy-to-clipboard button.
 * Supports optional value masking with a toggle to reveal the hidden value.
 *
 * @attr {string} value - The value to display and copy.
 * @attr {string} masked-value - An alternative masked display value (for example, "••••••").
 * @attr {string} label - Label for the copy button. Defaults to the localized "Copy" text.
 * @attr {boolean} readonly - Makes the inner input readonly.
 * @attr {boolean} disabled - Disables the inner input.
 * @attr {boolean} masked-toggle - Shows a toggle button to reveal/hide the masked value.
 * @attr {("text"|"password"|"email"|"number"|"tel"|"url"|"search"|"date"|"datetime-local"|"time"|"color")} type - Sets the input type.
 * @attr {string} placeholder - Placeholder text for the input.
 * @attr {string} validation-message - Custom validation message.
 * @attr {boolean} auto-validate - Validates the input on blur.
 */
@customElement("ha-input-copy")
export class HaInputCopy extends LitElement {
  @property({ attribute: "value" }) public value!: string;

  @property({ attribute: "masked-value" }) public maskedValue?: string;

  @property({ attribute: "label" }) public label?: string;

  @property({ type: Boolean }) public readonly = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "masked-toggle" }) public maskedToggle =
    false;

  @property() public type: InputType = "text";

  @property()
  public placeholder = "";

  @property({ attribute: "validation-message" })
  public validationMessage?: string;

  @property({ type: Boolean, attribute: "auto-validate" }) public autoValidate =
    false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _showMasked = true;

  @query("ha-input", true) private _inputElement?: HaInput;

  public reportValidity(): boolean {
    return this._inputElement?.reportValidity() ?? false;
  }

  public render() {
    return html`
      <div class="container">
        <div class="textfield-container">
          <ha-input
            .type=${this.type}
            .value=${this._showMasked && this.maskedValue
              ? this.maskedValue
              : this.value}
            .readonly=${this.readonly}
            .disabled=${this.disabled}
            @click=${this._focusInput}
            .placeholder=${this.placeholder}
            .autoValidate=${this.autoValidate}
            .validationMessage=${this.validationMessage}
          >
            ${this.maskedToggle && this.maskedValue
              ? html`<ha-icon-button
                  slot="end"
                  class="toggle-unmasked"
                  .label=${this._i18n.localize(
                    `ui.common.${this._showMasked ? "show" : "hide"}`
                  )}
                  @click=${this._toggleMasked}
                  .path=${this._showMasked ? mdiEye : mdiEyeOff}
                ></ha-icon-button>`
              : nothing}
          </ha-input>
        </div>
        <ha-button @click=${this._copy} appearance="plain" size="small">
          <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
          ${this.label || this._i18n.localize("ui.common.copy")}
        </ha-button>
      </div>
    `;
  }

  private _focusInput(ev: Event) {
    const inputElement = ev.currentTarget as HaInput;
    inputElement.select();
  }

  private _toggleMasked(): void {
    this._showMasked = !this._showMasked;
  }

  private async _copy(): Promise<void> {
    await copyToClipboard(this.value);
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
    .container {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      margin-top: 8px;
    }

    .textfield-container {
      position: relative;
      flex: 1;
    }

    .toggle-unmasked {
      --ha-icon-button-size: 40px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    ha-button {
      margin-bottom: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-copy": HaInputCopy;
  }
}

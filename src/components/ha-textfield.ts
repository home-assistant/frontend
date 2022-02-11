import { TextFieldBase } from "@material/mwc-textfield/mwc-textfield-base";
import { styles } from "@material/mwc-textfield/mwc-textfield.css";
import { TemplateResult, html, PropertyValues, css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-textfield")
export class HaTextField extends TextFieldBase {
  @property({ type: Boolean }) public invalid?: boolean;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (
      (changedProperties.has("invalid") &&
        (this.invalid || changedProperties.get("invalid") !== undefined)) ||
      changedProperties.has("errorMessage")
    ) {
      this.setCustomValidity(
        this.invalid ? this.errorMessage || "Invalid" : ""
      );
      this.reportValidity();
    }
  }

  protected override renderIcon(
    _icon: string,
    isTrailingIcon = false
  ): TemplateResult {
    const type = isTrailingIcon ? "trailing" : "leading";

    return html`
      <span
        class="mdc-text-field__icon mdc-text-field__icon--${type}"
        tabindex=${isTrailingIcon ? 1 : -1}
      >
        <slot name="${type}Icon"></slot>
      </span>
    `;
  }

  static override styles = [
    styles,
    css`
      .mdc-text-field__input {
        width: var(--ha-textfield-input-width, 100%);
      }
      .mdc-text-field:not(.mdc-text-field--with-leading-icon) {
        padding: var(--text-field-padding, 0px 16px);
      }
      .mdc-text-field__affix--suffix {
        padding-left: var(--text-field-suffix-padding-left, 12px);
        padding-right: var(--text-field-suffix-padding-right, 0px);
      }

      input {
        text-align: var(--text-field-text-align);
      }

      /* Chrome, Safari, Edge, Opera */
      :host([no-spinner]) input::-webkit-outer-spin-button,
      :host([no-spinner]) input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      /* Firefox */
      :host([no-spinner]) input[type="number"] {
        -moz-appearance: textfield;
      }

      .mdc-text-field__ripple {
        overflow: hidden;
      }

      .mdc-text-field {
        overflow: var(--text-field-overflow);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textfield": HaTextField;
  }
}

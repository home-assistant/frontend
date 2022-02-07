import { TextField } from "@material/mwc-textfield";
import { TemplateResult, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-textfield")
export class HaTextField extends TextField {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textfield": HaTextField;
  }
}

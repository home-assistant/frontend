import { TextField } from "@material/mwc-textfield";
import { TemplateResult, html } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-textfield")
export class HaTextField extends TextField {
  override renderIcon(
    _icon: string,
    isTrailingIcon: boolean = false
  ): TemplateResult {
    const type = isTrailingIcon ? "trailing" : "leading";

    return html`
      <span class="mdc-text-field__icon mdc-text-field__icon--${type}">
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

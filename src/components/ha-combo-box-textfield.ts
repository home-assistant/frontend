import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { HaTextField } from "./ha-textfield";

@customElement("ha-combo-box-textfield")
export class HaComboBoxTextField extends HaTextField {
  @property({ type: Boolean, attribute: "force-blank-value" })
  public forceBlankValue = false;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("value") || changedProps.has("forceBlankValue")) {
      if (this.forceBlankValue && this.value) {
        this.value = "";
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box-textfield": HaComboBoxTextField;
  }
}

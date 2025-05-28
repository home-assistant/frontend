import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { HaTextField } from "./ha-textfield";

@customElement("ha-combo-box-textfield")
export class HaComboBoxTextField extends HaTextField {
  @property({ type: Boolean, attribute: "disable-set-value" })
  public disableSetValue = false;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("value")) {
      if (this.disableSetValue) {
        this.value = changedProps.get("value") as string;
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box-textfield": HaComboBoxTextField;
  }
}

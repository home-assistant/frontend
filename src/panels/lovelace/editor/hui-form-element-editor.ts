import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { LovelaceConfigForm } from "../types";
import { HuiElementEditor } from "./hui-element-editor";

@customElement("hui-form-element-editor")
export class HuiFormElementEditor extends HuiElementEditor {
  @property({ attribute: false }) public schema!: HaFormSchema[];

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    return { schema: this.schema };
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("schema") &&
      changedProperties.get("schema") !== undefined
    ) {
      // Schema changed after initial load — destroy the old form editor
      // so loadConfigElement() recreates it with the new schema.
      // This ensures dynamic schema changes (e.g. disabled flags toggled
      // when the entity changes) are reflected in the rendered form.
      this.unloadConfigElement();
      const currentValue = this.value;
      if (currentValue) {
        // Spread to create a new reference so the value setter's
        // deepEqual guard doesn't short-circuit.
        this.value = { ...currentValue };
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-form-element-editor": HuiFormElementEditor;
  }
}

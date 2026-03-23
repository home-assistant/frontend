import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { LovelaceConfigForm } from "../types";
import type { HuiFormEditor } from "./config-elements/hui-form-editor";
import { HuiElementEditor } from "./hui-element-editor";

@customElement("hui-form-element-editor")
export class HuiFormElementEditor extends HuiElementEditor {
  @property({ attribute: false }) public schema!: HaFormSchema[];

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    return { schema: this.schema };
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("schema") && this._configElement) {
      // Propagate schema changes directly to the existing form editor element
      // so dynamic changes (e.g. disabled flags based on selected entity) are
      // reflected without needing to tear down and recreate the editor.
      (this._configElement as HuiFormEditor).schema = this.schema;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-form-element-editor": HuiFormElementEditor;
  }
}

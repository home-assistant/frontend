import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { LovelaceConfigForm } from "../types";
import type { HuiFormEditor } from "./config-elements/hui-form-editor";
import { HuiElementEditor } from "./hui-element-editor";

@customElement("hui-form-element-editor")
export class HuiFormElementEditor extends HuiElementEditor {
  @property({ attribute: false }) public form!: LovelaceConfigForm;

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    return this.form;
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (changedProperties.has("form") && this._configElement) {
      // Propagate schema changes directly to the existing form editor element
      // so dynamic changes (e.g. disabled flags based on selected entity) are
      // reflected without needing to tear down and recreate the editor.
      const { schema, assertConfig, computeLabel, computeHelper } = this.form;
      (this._configElement as HuiFormEditor).schema = schema;
      if (computeLabel) {
        (this._configElement as HuiFormEditor).computeLabel = computeLabel;
      }
      if (computeHelper) {
        (this._configElement as HuiFormEditor).computeHelper = computeHelper;
      }
      if (assertConfig) {
        (this._configElement as HuiFormEditor).assertConfig = assertConfig;
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-form-element-editor": HuiFormElementEditor;
  }
}

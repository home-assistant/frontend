import { customElement, property } from "lit/decorators";
import type { LovelaceConfigForm } from "../types";
import { HuiElementEditor } from "./hui-element-editor";

@customElement("hui-form-element-editor")
export class HuiFormElementEditor extends HuiElementEditor {
  @property({ attribute: false }) public form!: LovelaceConfigForm;

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    return this.form;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-form-element-editor": HuiFormElementEditor;
  }
}

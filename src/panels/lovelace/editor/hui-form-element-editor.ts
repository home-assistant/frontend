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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-form-element-editor": HuiFormElementEditor;
  }
}

import { customElement } from "lit/decorators";
import { getRowElementClass } from "../../create-element/create-row-element";
import { LovelaceRowConfig } from "../../entity-rows/types";
import type { LovelaceRowEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

const GENERIC_ROW_TYPE = "generic-row";

@customElement("hui-row-element-editor")
export class HuiRowElementEditor extends HuiElementEditor<LovelaceRowConfig> {
  protected get configElementType(): string | undefined {
    if (!this.value?.type && "entity" in this.value!) {
      return GENERIC_ROW_TYPE;
    }

    return this.value?.type;
  }

  protected async getConfigElement(): Promise<LovelaceRowEditor | undefined> {
    if (this.configElementType! === GENERIC_ROW_TYPE) {
      return document.createElement("hui-generic-entity-row-editor");
    }

    const elClass = await getRowElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-row-element-editor": HuiRowElementEditor;
  }
}

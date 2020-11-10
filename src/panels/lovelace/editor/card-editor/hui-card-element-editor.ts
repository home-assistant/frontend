import { customElement } from "lit-element";
import type { LovelaceCardConfig } from "../../../../data/lovelace";
import { getCardElementClass } from "../../create-element/create-card-element";
import type { LovelaceCardEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-card-element-editor")
export class HuiCardElementEditor extends HuiElementEditor<LovelaceCardConfig> {
  protected async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
    const elClass = await getCardElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-element-editor": HuiCardElementEditor;
  }
}

import { customElement } from "lit-element";
import { getCardElementClass } from "../../create-element/create-card-element";
import { LovelaceCardEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-card-element-editor")
export class HuiCardElementEditor extends HuiElementEditor {
  public async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
    let configElement: LovelaceCardEditor | undefined;

    const elClass = await getCardElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      configElement = await elClass.getConfigElement();
    }

    return configElement!;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-element-editor": HuiCardElementEditor;
  }
}

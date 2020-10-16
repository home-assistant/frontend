import { customElement } from "lit-element";
import { getHeaderFooterElementClass } from "../../create-element/create-header-footer-element";
import { LovelaceHeaderFooterEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-headerfooter-element-editor")
export class HuiHeaderFooterElementEditor extends HuiElementEditor {
  public async getConfigElement(): Promise<
    LovelaceHeaderFooterEditor | undefined
  > {
    let configElement: LovelaceHeaderFooterEditor | undefined;

    const elClass = await getHeaderFooterElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      configElement = await elClass.getConfigElement();
    }

    return configElement!;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-headerfooter-element-editor": HuiHeaderFooterElementEditor;
  }
}

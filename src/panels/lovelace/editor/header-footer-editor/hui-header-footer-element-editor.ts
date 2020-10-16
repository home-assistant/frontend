import { customElement } from "lit-element";
import { getHeaderFooterElementClass } from "../../create-element/create-header-footer-element";
import type { LovelaceHeaderFooterEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-headerfooter-element-editor")
export class HuiHeaderFooterElementEditor extends HuiElementEditor {
  protected async getConfigElement(): Promise<
    LovelaceHeaderFooterEditor | undefined
  > {
    const elClass = await getHeaderFooterElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-headerfooter-element-editor": HuiHeaderFooterElementEditor;
  }
}

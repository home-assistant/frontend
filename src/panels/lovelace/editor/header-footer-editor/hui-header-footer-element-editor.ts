import { customElement } from "lit/decorators";
import { getHeaderFooterElementClass } from "../../create-element/create-header-footer-element";
import type { LovelaceHeaderFooterConfig } from "../../header-footer/types";
import type { LovelaceHeaderFooterEditor } from "../../types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";

@customElement("hui-headerfooter-element-editor")
export class HuiHeaderFooterElementEditor extends HuiTypedElementEditor<LovelaceHeaderFooterConfig> {
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

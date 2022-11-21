import { customElement } from "lit/decorators";
import { getTileExtraElementClass } from "../../create-element/create-tile-extra-element";
import { LovelaceTileExtraConfig } from "../../tile-extra/types";
import type { LovelaceTileExtraEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-tile-extra-element-editor")
export class HuiTileExtraElementEditor extends HuiElementEditor<LovelaceTileExtraConfig> {
  protected async getConfigElement(): Promise<
    LovelaceTileExtraEditor | undefined
  > {
    const elClass = await getTileExtraElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-extra-element-editor": HuiTileExtraElementEditor;
  }
}

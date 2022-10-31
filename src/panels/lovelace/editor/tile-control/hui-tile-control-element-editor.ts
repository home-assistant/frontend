import { customElement } from "lit/decorators";
import { getTileControlElementClass } from "../../create-element/create-tile-control-element";
import { LovelaceTileControlConfig } from "../../tile-control/types";
import type { LovelaceTileControlEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-tile-control-element-editor")
export class HuiTileControlElementEditor extends HuiElementEditor<LovelaceTileControlConfig> {
  protected async getConfigElement(): Promise<
    LovelaceTileControlEditor | undefined
  > {
    const elClass = await getTileControlElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-control-element-editor": HuiTileControlElementEditor;
  }
}

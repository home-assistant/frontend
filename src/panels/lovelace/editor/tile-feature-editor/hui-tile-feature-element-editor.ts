import { customElement } from "lit/decorators";
import { getTileFeatureElementClass } from "../../create-element/create-tile-feature-element";
import {
  LovelaceTileFeatureConfig,
  LovelaceTileFeatureContext,
} from "../../tile-features/types";
import type {
  LovelaceConfigForm,
  LovelaceTileFeatureEditor,
} from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-tile-feature-element-editor")
export class HuiTileFeatureElementEditor extends HuiElementEditor<
  LovelaceTileFeatureConfig,
  LovelaceTileFeatureContext
> {
  protected async getConfigElement(): Promise<
    LovelaceTileFeatureEditor | undefined
  > {
    const elClass = await getTileFeatureElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const elClass = await getTileFeatureElementClass(this.configElementType!);

    // Check if a schema exists
    if (elClass && elClass.getConfigForm) {
      return elClass.getConfigForm();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-feature-element-editor": HuiTileFeatureElementEditor;
  }
}

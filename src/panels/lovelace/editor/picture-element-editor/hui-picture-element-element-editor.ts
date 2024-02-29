import { customElement } from "lit/decorators";
import { LovelaceElementConfig } from "../../elements/types";
import type { LovelacePictureElementEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";
import "../config-elements/elements/hui-state-badge-element-editor";
import "../config-elements/elements/hui-state-icon-element-editor";
import "../config-elements/elements/hui-state-label-element-editor";
import "../config-elements/elements/hui-service-button-element-editor";
import "../config-elements/elements/hui-icon-element-editor";
import "../config-elements/elements/hui-image-element-editor";
import "../config-elements/elements/hui-conditional-element-editor";
import { getPictureElementClass } from "../../create-element/create-picture-element";

@customElement("hui-picture-element-element-editor")
export class HuiPictureElementElementEditor extends HuiElementEditor<LovelaceElementConfig> {
  protected get configElementType(): string | undefined {
    return this.value?.type;
  }

  protected async getConfigElement(): Promise<
    LovelacePictureElementEditor | undefined
  > {
    const elClass = await getPictureElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-element-element-editor": HuiPictureElementElementEditor;
  }
}

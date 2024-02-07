import { customElement } from "lit/decorators";
import { LovelaceElementConfig } from "../../elements/types";
import type { LovelacePictureElementEditor } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";
import "../config-elements/hui-state-badge-element-editor";
import "../config-elements/hui-state-icon-element-editor";

@customElement("hui-picture-element-element-editor")
export class HuiPictureElementElementEditor extends HuiElementEditor<LovelaceElementConfig> {
  protected get configElementType(): string | undefined {
    return this.value?.type;
  }

  protected async getConfigElement(): Promise<
    LovelacePictureElementEditor | undefined
  > {
    if (this.configElementType === "state-badge") {
      return document.createElement("hui-state-badge-element-editor");
    }
    if (this.configElementType === "state-icon") {
      return document.createElement("hui-state-icon-element-editor");
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-element-element-editor": HuiPictureElementElementEditor;
  }
}

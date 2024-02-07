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
    if (this.configElementType === "state-label") {
      return document.createElement("hui-state-label-element-editor");
    }
    if (this.configElementType === "service-button") {
      return document.createElement("hui-service-button-element-editor");
    }
    if (this.configElementType === "icon") {
      return document.createElement("hui-icon-element-editor");
    }
    if (this.configElementType === "image") {
      return document.createElement("hui-image-element-editor");
    }
    if (this.configElementType === "conditional") {
      return document.createElement("hui-conditional-element-editor");
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-element-element-editor": HuiPictureElementElementEditor;
  }
}

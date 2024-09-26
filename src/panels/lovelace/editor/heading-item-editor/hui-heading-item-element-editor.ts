import { customElement } from "lit/decorators";
import { getHeadingItemElementClass } from "../../create-element/create-heading-element";
import type { EntityHeadingItemConfig } from "../../heading-items/types";
import { LovelaceConfigForm, LovelaceHeadingItemEditor } from "../../types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";

@customElement("hui-heading-item-element-editor")
export class HuiHeadingEntityElementEditor extends HuiTypedElementEditor<EntityHeadingItemConfig> {
  protected get configElementType(): string | undefined {
    if (!this.value?.type) {
      return "entity";
    }

    return this.value?.type;
  }

  protected async getConfigElement(): Promise<
    LovelaceHeadingItemEditor | undefined
  > {
    const elClass = await getHeadingItemElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const elClass = await getHeadingItemElementClass(this.configElementType!);

    // Check if a schema exists
    if (elClass && elClass.getConfigForm) {
      return elClass.getConfigForm();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-item-element-editor": HuiHeadingEntityElementEditor;
  }
}

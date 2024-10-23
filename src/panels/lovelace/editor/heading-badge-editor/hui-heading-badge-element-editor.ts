import { customElement } from "lit/decorators";
import { getHeadingBadgeElementClass } from "../../create-element/create-heading-badge-element";
import type { EntityHeadingBadgeConfig } from "../../heading-badges/types";
import type {
  LovelaceConfigForm,
  LovelaceHeadingBadgeEditor,
} from "../../types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";

@customElement("hui-heading-badge-element-editor")
export class HuiHeadingEntityElementEditor extends HuiTypedElementEditor<EntityHeadingBadgeConfig> {
  protected get configElementType(): string | undefined {
    return this.value?.type || "entity";
  }

  protected async getConfigElement(): Promise<
    LovelaceHeadingBadgeEditor | undefined
  > {
    const elClass = await getHeadingBadgeElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const elClass = await getHeadingBadgeElementClass(this.configElementType!);

    // Check if a schema exists
    if (elClass && elClass.getConfigForm) {
      return elClass.getConfigForm();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-badge-element-editor": HuiHeadingEntityElementEditor;
  }
}

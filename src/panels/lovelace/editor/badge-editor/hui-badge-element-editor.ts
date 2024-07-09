import { customElement } from "lit/decorators";
import { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { getBadgeElementClass } from "../../create-element/create-badge-element";
import type { LovelaceCardEditor, LovelaceConfigForm } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";

@customElement("hui-badge-element-editor")
export class HuiBadgeElementEditor extends HuiElementEditor<LovelaceBadgeConfig> {
  protected async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
    const elClass = await getBadgeElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const elClass = await getBadgeElementClass(this.configElementType!);

    // Check if a schema exists
    if (elClass && elClass.getConfigForm) {
      return elClass.getConfigForm();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-element-editor": HuiBadgeElementEditor;
  }
}

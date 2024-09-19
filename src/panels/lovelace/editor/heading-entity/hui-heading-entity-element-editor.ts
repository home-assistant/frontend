import { customElement } from "lit/decorators";

import { HeadingCardEntityConfig } from "../../cards/types";
import { HuiElementEditor } from "../hui-element-editor";
import type { HuiHeadingEntityEditor } from "./hui-heading-entity-editor";

@customElement("hui-heading-entity-element-editor")
export class HuiCardFeatureElementEditor extends HuiElementEditor<HeadingCardEntityConfig> {
  protected async getConfigElement(): Promise<
    HuiHeadingEntityEditor | undefined
  > {
    await import("./hui-heading-entity-editor");
    return document.createElement("hui-heading-entity-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-entity-element-editor": HuiCardFeatureElementEditor;
  }
}

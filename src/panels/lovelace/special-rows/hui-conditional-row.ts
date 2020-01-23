import { customElement } from "lit-element";

import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createRowElement } from "../create-element/create-row-element";
import { LovelaceRow, ConditionalRowConfig } from "../entity-rows/types";

@customElement("hui-conditional-row")
class HuiConditionalRow extends HuiConditionalBase implements LovelaceRow {
  public setConfig(config: ConditionalRowConfig): void {
    super.setConfig(config);
    if (!config.row) {
      throw new Error("No row option configured.");
    }

    this._element = createRowElement(config.row) as LovelaceRow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}

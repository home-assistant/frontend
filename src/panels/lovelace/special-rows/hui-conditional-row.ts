import { customElement } from "lit/decorators";
import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createRowElement } from "../create-element/create-row-element";
import { ConditionalRowConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-conditional-row")
class HuiConditionalRow extends HuiConditionalBase implements LovelaceRow {
  public setConfig(config: ConditionalRowConfig): void {
    this.validateConfig(config);

    if (!config.row) {
      throw new Error("No row configured");
    }

    this._element = createRowElement(config.row) as LovelaceRow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}

import { customElement } from "lit-element";

import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createRowElement } from "../create-element/create-row-element";
import { LovelaceRow, ConditionalRowConfig } from "../entity-rows/types";

@customElement("hui-conditional-row")
class HuiConditionalRow extends HuiConditionalBase implements LovelaceRow {
  public setConfig(config: ConditionalRowConfig): void {
    this.validateConfig(config);

    if (!config.row) {
      throw new Error("No row configured.");
    }

    if (this._element && this._element.parentElement) {
      this.removeChild(this._element);
    }

    this._element = createRowElement(config.row) as LovelaceRow;
    this.appendChild(this._element);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}

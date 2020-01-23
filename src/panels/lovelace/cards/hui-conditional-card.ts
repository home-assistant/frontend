import { customElement } from "lit-element";

import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard } from "../types";
import { computeCardSize } from "../common/compute-card-size";

@customElement("hui-conditional-card")
class HuiConditionalCard extends HuiConditionalBase implements LovelaceCard {
  public setConfig(config) {
    super.setConfig(config);
    if (!config.card) {
      throw new Error("No card option configured.");
    }

    this._element = createCardElement(config.card) as LovelaceCard;
  }

  public getCardSize() {
    return computeCardSize(this._element as LovelaceCard);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

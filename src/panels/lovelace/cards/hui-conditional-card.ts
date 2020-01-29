import { customElement } from "lit-element";

import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard } from "../types";
import { computeCardSize } from "../common/compute-card-size";
import { ConditionalCardConfig } from "./types";

@customElement("hui-conditional-card")
class HuiConditionalCard extends HuiConditionalBase implements LovelaceCard {
  public setConfig(config: ConditionalCardConfig): void {
    this.validateConfig(config);

    if (!config.card) {
      throw new Error("No card configured.");
    }

    this._element = createCardElement(config.card) as LovelaceCard;
  }

  public getCardSize(): number {
    return computeCardSize(this._element as LovelaceCard);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

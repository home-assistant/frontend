import { customElement } from "lit-element";

import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { computeCardSize } from "../common/compute-card-size";
import { ConditionalCardConfig } from "./types";

@customElement("hui-conditional-card")
class HuiConditionalCard extends HuiConditionalBase implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-conditional-card-editor" */ "../editor/config-elements/hui-conditional-card-editor"
    );
    return document.createElement("hui-conditional-card-editor");
  }

  public static getStubConfig(): ConditionalCardConfig {
    return {
      type: "conditional",
      conditions: [],
      card: { type: "" },
    };
  }

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

import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { ConditionalCardConfig } from "./types";

import { customElement } from "lit/decorators";

import { fireEvent } from "../../../common/dom/fire_event";
import { computeCardSize } from "../common/compute-card-size";
import { HuiConditionalBase } from "../components/hui-conditional-base";

@customElement("hui-conditional-card")
class HuiConditionalCard extends HuiConditionalBase implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-conditional-card-editor");
    return document.createElement("hui-conditional-card-editor");
  }

  public static getStubConfig(): ConditionalCardConfig {
    return {
      type: "conditional",
      conditions: [],
      // @ts-ignore
      card: {},
    };
  }

  public setConfig(config: ConditionalCardConfig): void {
    this.validateConfig(config);

    if (!config.card) {
      throw new Error("No card configured");
    }

    this._element = this._createCardElement(config.card);
  }

  public getCardSize(): Promise<number> | number {
    return computeCardSize(this._element as LovelaceCard);
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.preview;
    element.config = cardConfig;
    element.load();
    return element;
  }

  protected setVisibility(conditionMet: boolean): void {
    const visible = this.preview || conditionMet;
    const previouslyHidden = this.hidden;
    super.setVisibility(conditionMet);
    if (previouslyHidden !== this.hidden) {
      fireEvent(this, "card-visibility-changed", { value: visible });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

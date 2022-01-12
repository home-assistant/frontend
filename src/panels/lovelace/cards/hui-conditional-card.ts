import { customElement } from "lit/decorators";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { computeCardSize } from "../common/compute-card-size";
import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { ConditionalCardConfig } from "./types";

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
    const element = createCardElement(cardConfig) as LovelaceCard;
    if (this.hass) {
      element.hass = this.hass;
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(cardConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildCard(config: LovelaceCardConfig): void {
    this._element = this._createCardElement(config);
    if (this.lastChild) {
      this.replaceChild(this._element, this.lastChild);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

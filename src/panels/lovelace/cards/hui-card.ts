import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { createCardElement } from "../create-element/create-card-element";
import type { Lovelace, LovelaceCard } from "../types";

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  private _element?: LovelaceCard;

  protected createRenderRoot() {
    return this;
  }

  public willUpdate(changedProperties: PropertyValues<typeof this>): void {
    super.willUpdate(changedProperties);
    const oldConfig = changedProperties.get("config");

    // If config has changed, create element if necessary and set all values.
    if (
      changedProperties.has("config") &&
      (!oldConfig || this.config !== oldConfig)
    ) {
      this._initializeConfig();
    }
  }

  protected update(changedProperties: PropertyValues<typeof this>) {
    super.update(changedProperties);

    if (this._element) {
      if (changedProperties.has("hass")) {
        this._element.hass = this.hass;
      }
      if (changedProperties.has("lovelace")) {
        this._element.editMode = this.lovelace.editMode;
      }
    }
  }

  private async _initializeConfig() {
    const cardConfig = this.config;

    this._element = createCardElement(cardConfig) as LovelaceCard;

    this._element!.hass = this.hass;
    this._element!.editMode = this.lovelace.editMode;

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this.appendChild(this._element!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card": HuiCard;
  }
}

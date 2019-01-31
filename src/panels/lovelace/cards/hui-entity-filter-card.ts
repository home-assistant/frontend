import { createCardElement } from "../common/create-card-element";
import { processConfigEntities } from "../common/process-config-entities";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

export interface EntityFilterCardConfig extends LovelaceCardConfig {
  type: "entity-filter";
  entities: Array<EntityConfig | string>;
  state_filter: string[];
  card: Partial<LovelaceCardConfig>;
  show_empty?: boolean;
}

class EntityFilterCard extends HTMLElement implements LovelaceCard {
  public isPanel?: boolean;
  private _element?: LovelaceCard;
  private _config?: EntityFilterCardConfig;
  private _configEntities?: EntityConfig[];
  private _baseCardConfig?: LovelaceCardConfig;

  public getCardSize(): number {
    return this._element ? this._element.getCardSize() : 1;
  }

  public setConfig(config: EntityFilterCardConfig): void {
    if (!config.state_filter || !Array.isArray(config.state_filter)) {
      throw new Error("Incorrect filter config.");
    }

    this._config = config;
    this._configEntities = undefined;
    this._baseCardConfig = {
      type: "entities",
      entities: [],
      ...this._config.card,
    };

    if (this.lastChild) {
      this.removeChild(this.lastChild);
      this._element = undefined;
    }
  }

  set hass(hass: HomeAssistant) {
    if (!hass || !this._config) {
      return;
    }

    if (!this._configEntities) {
      this._configEntities = processConfigEntities(this._config.entities);
    }

    const entitiesList = this._configEntities.filter((entityConf) => {
      const stateObj = hass.states[entityConf.entity];
      return stateObj && this._config!.state_filter.includes(stateObj.state);
    });

    if (entitiesList.length === 0 && this._config.show_empty === false) {
      this.style.display = "none";
      return;
    }

    const element = this._cardElement();

    if (!element) {
      return;
    }

    if (element.tagName !== "HUI-ERROR-CARD") {
      element.setConfig({ ...this._baseCardConfig!, entities: entitiesList });
      element.isPanel = this.isPanel;
      element.hass = hass;
    }

    // Attach element if it has never been attached.
    if (!this.lastChild) {
      this.appendChild(element);
    }

    this.style.display = "block";
  }

  private _cardElement(): LovelaceCard | undefined {
    if (!this._element && this._config) {
      const element = createCardElement(this._baseCardConfig!);
      this._element = element;
    }

    return this._element;
  }
}
customElements.define("hui-entity-filter-card", EntityFilterCard);

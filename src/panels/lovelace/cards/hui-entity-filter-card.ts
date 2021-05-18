import { PropertyValues, ReactiveElement } from "lit";
import { property, state } from "lit/decorators";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { evaluateFilter } from "../common/evaluate-filter";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import { createCardElement } from "../create-element/create-card-element";
import { EntityFilterEntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { EntityFilterCardConfig } from "./types";

class EntityFilterCard extends ReactiveElement implements LovelaceCard {
  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): EntityFilterCardConfig {
    const maxEntities = 3;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      ["light", "switch", "sensor"]
    );

    return {
      type: "entity-filter",
      entities: foundEntities,
      state_filter: [
        foundEntities[0] ? hass.states[foundEntities[0]].state : "",
      ],
      card: { type: "entities" },
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public isPanel = false;

  @property() public editMode = false;

  @state() private _config?: EntityFilterCardConfig;

  private _element?: LovelaceCard;

  private _configEntities?: EntityFilterEntityConfig[];

  private _baseCardConfig?: LovelaceCardConfig;

  private _oldEntities?: EntityFilterEntityConfig[];

  public getCardSize(): number | Promise<number> {
    return this._element ? computeCardSize(this._element) : 1;
  }

  public setConfig(config: EntityFilterCardConfig): void {
    if (!config.entities.length || !Array.isArray(config.entities)) {
      throw new Error("Entities must be specified");
    }

    if (
      !(config.state_filter && Array.isArray(config.state_filter)) &&
      !config.entities.every(
        (entity) =>
          typeof entity === "object" &&
          entity.state_filter &&
          Array.isArray(entity.state_filter)
      )
    ) {
      throw new Error("Incorrect filter config");
    }

    this._configEntities = processConfigEntities(config.entities);
    this._config = config;
    this._baseCardConfig = {
      type: "entities",
      entities: [],
      ...this._config.card,
    };

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    this._element = this._createCardElement(this._baseCardConfig);
  }

  protected createRenderRoot() {
    return this;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (this._element) {
      this._element.hass = this.hass;
      this._element.editMode = this.editMode;
      this._element.isPanel = this.isPanel;
    }

    if (changedProps.has("_config")) {
      return true;
    }
    if (changedProps.has("hass")) {
      return this._haveEntitiesChanged(
        changedProps.get("hass") as HomeAssistant | null
      );
    }
    return false;
  }

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);
    if (
      !this.hass ||
      !this._config ||
      !this._configEntities ||
      !this._element
    ) {
      return;
    }

    const entitiesList = this._configEntities.filter((entityConf) => {
      const stateObj = this.hass!.states[entityConf.entity];

      if (!stateObj) {
        return false;
      }

      if (entityConf.state_filter) {
        for (const filter of entityConf.state_filter) {
          if (evaluateFilter(stateObj, filter)) {
            return true;
          }
        }
      } else {
        for (const filter of this._config!.state_filter) {
          if (evaluateFilter(stateObj, filter)) {
            return true;
          }
        }
      }

      return false;
    });

    if (entitiesList.length === 0 && this._config.show_empty === false) {
      this.style.display = "none";
      return;
    }

    if (!this.lastChild) {
      this._element.setConfig({
        ...this._baseCardConfig!,
        entities: entitiesList,
      });
      this._oldEntities = entitiesList;
    } else if (this._element.tagName !== "HUI-ERROR-CARD") {
      const isSame =
        this._oldEntities &&
        entitiesList.length === this._oldEntities.length &&
        entitiesList.every((entity, idx) => entity === this._oldEntities![idx]);

      if (!isSame) {
        this._oldEntities = entitiesList;
        this._element.setConfig({
          ...this._baseCardConfig!,
          entities: entitiesList,
        });
      }
    }

    // Attach element if it has never been attached.
    if (!this.lastChild) {
      this.appendChild(this._element);
    }

    this.style.display = "block";
  }

  private _haveEntitiesChanged(oldHass: HomeAssistant | null): boolean {
    if (!this.hass || !oldHass) {
      return true;
    }

    if (!this._configEntities) {
      return true;
    }

    if (this.hass.localize !== oldHass.localize) {
      return true;
    }

    for (const config of this._configEntities) {
      if (this.hass.states[config.entity] !== oldHass.states[config.entity]) {
        return true;
      }
    }

    return false;
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    if (this.hass) {
      element.hass = this.hass;
    }
    element.isPanel = this.isPanel;
    element.editMode = this.editMode;
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(element, cardConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildCard(
    cardElToReplace: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    const newCardEl = this._createCardElement(config);
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    }
    this._element = newCardEl;
  }
}
customElements.define("hui-entity-filter-card", EntityFilterCard);

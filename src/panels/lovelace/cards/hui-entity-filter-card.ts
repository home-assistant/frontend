import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { evaluateStateFilter } from "../common/evaluate-filter";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import {
  addEntityToCondition,
  checkConditionsMet,
  extractConditionEntityIds,
} from "../common/validate-condition";
import { EntityFilterEntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { HuiCard } from "./hui-card";
import { EntityFilterCardConfig } from "./types";

@customElement("hui-entity-filter-card")
export class HuiEntityFilterCard
  extends ReactiveElement
  implements LovelaceCard
{
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
      conditions: foundEntities[0]
        ? [
            {
              condition: "state",
              state: hass.states[foundEntities[0]].state,
            },
          ]
        : [],
      card: { type: "entities" },
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: EntityFilterCardConfig;

  private _element?: HuiCard;

  private _configEntities?: EntityFilterEntityConfig[];

  private _baseCardConfig?: LovelaceCardConfig;

  private _oldEntities?: EntityFilterEntityConfig[];

  public getCardSize(): number | Promise<number> {
    return this._element ? computeCardSize(this._element) : 1;
  }

  public setConfig(config: EntityFilterCardConfig): void {
    if (
      !config.entities ||
      !config.entities.length ||
      !Array.isArray(config.entities)
    ) {
      throw new Error("Entities must be specified");
    }

    if (
      !(
        (config.conditions && Array.isArray(config.conditions)) ||
        (config.state_filter && Array.isArray(config.state_filter))
      ) &&
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
      this._element.preview = this.preview;
      this._element.layout = this.layout;
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
      if (!stateObj) return false;

      const conditions = entityConf.conditions ?? this._config!.conditions;
      if (conditions) {
        const conditionWithEntity = conditions.map((condition) =>
          addEntityToCondition(condition, entityConf.entity)
        );
        return checkConditionsMet(conditionWithEntity, this.hass!);
      }

      const filters = entityConf.state_filter ?? this._config!.state_filter;
      if (filters) {
        return filters.some((filter) => evaluateStateFilter(stateObj, filter));
      }

      return false;
    });

    if (entitiesList.length === 0 && this._config.show_empty === false) {
      if (!this.hidden) {
        this.style.display = "none";
        this.toggleAttribute("hidden", true);
        fireEvent(this, "card-visibility-changed", { value: false });
      }
      return;
    }

    if (!this.lastChild) {
      this._element.config = {
        ...this._baseCardConfig!,
        entities: entitiesList,
      };
      this._oldEntities = entitiesList;
    } else {
      const isSame =
        this._oldEntities &&
        entitiesList.length === this._oldEntities.length &&
        entitiesList.every((entity, idx) => entity === this._oldEntities![idx]);

      if (!isSame) {
        this._oldEntities = entitiesList;
        this._element.config = {
          ...this._baseCardConfig!,
          entities: entitiesList,
        };
      }
    }

    // Attach element if it has never been attached.
    if (!this.lastChild) {
      this.appendChild(this._element);
    }

    if (this.hidden) {
      this.style.display = "block";
      this.toggleAttribute("hidden", false);
      fireEvent(this, "card-visibility-changed", { value: true });
    }
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
      if (config.conditions) {
        const entityIds = extractConditionEntityIds(config.conditions);
        for (const entityId of entityIds) {
          if (this.hass.states[entityId] !== oldHass.states[entityId]) {
            return true;
          }
        }
      }
    }

    if (this._config?.conditions) {
      const entityIds = extractConditionEntityIds(this._config?.conditions);
      for (const entityId of entityIds) {
        if (this.hass.states[entityId] !== oldHass.states[entityId]) {
          return true;
        }
      }
    }

    return false;
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.preview;
    element.config = cardConfig;
    element.load();
    return element;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-filter-card": HuiEntityFilterCard;
  }
}

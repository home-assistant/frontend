import { PropertyValues, ReactiveElement } from "lit";
import { property, state } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { evaluateFilter } from "../common/evaluate-filter";
import { processConfigEntities } from "../common/process-config-entities";
import { createBadgeElement } from "../create-element/create-badge-element";
import { EntityFilterEntityConfig } from "../entity-rows/types";
import { LovelaceBadge } from "../types";
import { EntityFilterBadgeConfig } from "./types";

class EntityFilterBadge extends ReactiveElement implements LovelaceBadge {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EntityFilterBadgeConfig;

  private _elements?: LovelaceBadge[];

  private _configEntities?: EntityFilterEntityConfig[];

  private _oldEntities?: EntityFilterEntityConfig[];

  public setConfig(config: EntityFilterBadgeConfig): void {
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

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this._elements = undefined;

    this._configEntities = processConfigEntities(config.entities);
    this._oldEntities = undefined;
    this._config = config;
  }

  protected createRenderRoot() {
    return this;
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (
      changedProperties.has("_config") ||
      (changedProperties.has("hass") &&
        this.haveEntitiesChanged(
          changedProperties.get("hass") as HomeAssistant | undefined
        ))
    ) {
      return true;
    }
    return false;
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);
    if (!this.hass || !this._configEntities) {
      return;
    }

    if (this._elements) {
      for (const element of this._elements) {
        element.hass = this.hass;
      }
    }

    const entitiesList = this._configEntities.filter((entityConf) => {
      const stateObj = this.hass.states[entityConf.entity];

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

    if (entitiesList.length === 0) {
      this.style.display = "none";
      this._oldEntities = entitiesList;
      return;
    }

    const isSame =
      this._oldEntities &&
      entitiesList.length === this._oldEntities.length &&
      entitiesList.every((entity, idx) => entity === this._oldEntities![idx]);

    if (!isSame) {
      this._elements = [];
      for (const badgeConfig of entitiesList) {
        const element = createBadgeElement(badgeConfig);
        element.hass = this.hass;
        this._elements.push(element);
      }
      this._oldEntities = entitiesList;
    }

    if (!this._elements) {
      return;
    }

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    for (const element of this._elements) {
      this.appendChild(element);
    }

    this.style.display = "inline";
  }

  private haveEntitiesChanged(oldHass?: HomeAssistant): boolean {
    if (!oldHass) {
      return true;
    }

    if (!this._oldEntities || this.hass.localize !== oldHass.localize) {
      return true;
    }

    for (const config of this._configEntities!) {
      if (this.hass.states[config.entity] !== oldHass.states[config.entity]) {
        return true;
      }
    }

    return false;
  }
}
customElements.define("hui-entity-filter-badge", EntityFilterBadge);

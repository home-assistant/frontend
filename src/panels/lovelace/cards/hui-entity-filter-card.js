import { PolymerElement } from "@polymer/polymer/polymer-element";

import createCardElement from "../common/create-card-element";
import { processConfigEntities } from "../common/process-config-entities";

function getEntities(hass, filterState, entities) {
  return entities.filter((entityConf) => {
    const stateObj = hass.states[entityConf.entity];
    return stateObj && filterState.includes(stateObj.state);
  });
}

class HuiEntitiesCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
    };
  }

  getCardSize() {
    return this.lastChild ? this.lastChild.getCardSize() : 1;
  }

  setConfig(config) {
    if (!config.state_filter || !Array.isArray(config.state_filter)) {
      throw new Error("Incorrect filter config.");
    }

    this._config = config;
    this._configEntities = processConfigEntities(config.entities);

    if (this.lastChild) {
      this.removeChild(this.lastChild);
      this._element = null;
    }

    const card = "card" in config ? { ...config.card } : {};
    if (!card.type) card.type = "entities";
    card.entities = [];

    const element = createCardElement(card);
    element._filterRawConfig = card;
    this._updateCardConfig(element);

    this._element = element;
  }

  _hassChanged() {
    this._updateCardConfig(this._element);
  }

  _updateCardConfig(element) {
    if (!element || element.tagName === "HUI-ERROR-CARD" || !this.hass) return;
    const entitiesList = getEntities(
      this.hass,
      this._config.state_filter,
      this._configEntities
    );

    if (entitiesList.length === 0 && this._config.show_empty === false) {
      this.style.display = "none";
      return;
    }

    this.style.display = "block";
    element.setConfig({ ...element._filterRawConfig, entities: entitiesList });
    element.isPanel = this.isPanel;
    element.hass = this.hass;

    // Attach element if it has never been attached.
    if (!this.lastChild) this.appendChild(element);
  }
}
customElements.define("hui-entity-filter-card", HuiEntitiesCard);

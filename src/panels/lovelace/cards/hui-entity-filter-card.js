import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import createCardElement from '../common/create-card-element.js';
import processConfigEntities from '../common/process-config-entities.js';

function getEntities(hass, filter_state, entities) {
  return entities.filter((entityConf) => {
    const stateObj = hass.states[entityConf.entity];
    return stateObj && filter_state.includes(stateObj.state);
  });
}

class HuiEntitiesCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
    };
  }

  getCardSize() {
    return this.lastChild ? this.lastChild.getCardSize() : 1;
  }

  setConfig(config) {
    if (!config.state_filter || !Array.isArray(config.state_filter)) {
      throw new Error('Incorrect filter config.');
    }

    this._config = config;
    this._configEntities = processConfigEntities(config.entities);

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const card = 'card' in config ? Object.assign({}, config.card) : {};
    if (!card.type) card.type = 'entities';
    card.entities = [];

    const element = createCardElement(card);
    element._filterRawConfig = card;
    this._updateCardConfig(element);
    element.hass = this.hass;
    this.appendChild(element);
  }

  _hassChanged(hass) {
    const element = this.lastChild;
    this._updateCardConfig(element);
    element.hass = hass;
  }

  _updateCardConfig(element) {
    if (!element || element.tagName === 'HUI-ERROR-CARD' || !this.hass) return;
    const entitiesList = getEntities(this.hass, this._config.state_filter, this._configEntities);

    if (entitiesList.length === 0 && this._config.show_empty === false) {
      this.style.display = 'none';
      return;
    }

    this.style.display = 'block';
    element.setConfig(Object.assign(
      {},
      element._filterRawConfig,
      { entities: entitiesList }
    ));
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);

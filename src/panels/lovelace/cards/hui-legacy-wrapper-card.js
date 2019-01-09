import { createErrorCardConfig } from "./hui-error-card";
import computeDomain from "../../../common/entity/compute_domain";

export default class LegacyWrapperCard extends HTMLElement {
  constructor(tag, domain) {
    super();
    this._tag = tag.toUpperCase();
    this._domain = domain;
    this._element = null;
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("No entity specified");
    }

    if (computeDomain(config.entity) !== this._domain) {
      throw new Error(
        `Specified entity needs to be of domain ${this._domain}.`
      );
    }

    this._config = config;
  }

  set hass(hass) {
    const entityId = this._config.entity;

    if (entityId in hass.states) {
      this._ensureElement(this._tag);
      this.lastChild.hass = hass;
      this.lastChild.stateObj = hass.states[entityId];
      this.lastChild.config = this._config;
    } else {
      this._ensureElement("HUI-ERROR-CARD");
      this.lastChild.setConfig(
        createErrorCardConfig(
          `No state available for ${entityId}`,
          this._config
        )
      );
    }
  }

  _ensureElement(tag) {
    if (this.lastChild && this.lastChild.tagName === tag) return;

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    this.appendChild(document.createElement(tag));
  }
}

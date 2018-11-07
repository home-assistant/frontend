import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";

import NavigateMixin from "../../../mixins/navigate-mixin";

/*
 * @appliesMixin NavigateMixin
 */
class HuiPictureCard extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        ha-card {
          overflow: hidden;
        }
        ha-card[clickable] {
          cursor: pointer;
        }
        img {
          display: block;
          width: 100%;
        }
      </style>

      <ha-card
        on-click="_cardClicked"
        clickable$="[[_computeClickable(_config)]]"
      >
        <img src="[[_config.image]]" />
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!config || !config.image) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  _computeClickable(config) {
    return config.navigation_path || config.service;
  }

  _cardClicked() {
    if (this._config.navigation_path) {
      this.navigate(this._config.navigation_path);
    }
    if (this._config.service) {
      const [domain, service] = this._config.service.split(".", 2);
      this.hass.callService(domain, service, this._config.service_data);
    }
  }
}

customElements.define("hui-picture-card", HuiPictureCard);

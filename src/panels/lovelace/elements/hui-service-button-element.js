import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';

class HuiServiceButtonElement extends PolymerElement {
  static get template() {
    return html`
      <ha-call-service-button 
        hass="[[hass]]"
        domain="[[_domain]]" 
        service="[[_service]]"
        serviceData="[[_config.serviceData]]"
      >[[_config.title]]</ha-call-service-button> 
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _domain: String,
      _service: String
    };
  }

  setConfig(config) {
    if (!config || !config.service) {
      throw Error('Error in element configuration');
    }

    [this._domain, this._service] = config.service.split('.', 2);
    this._config = config;
  }
}
customElements.define('hui-service-button-element', HuiServiceButtonElement);

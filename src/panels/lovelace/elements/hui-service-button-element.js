import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';

class HuiServiceButtonElement extends PolymerElement {
  static get template() {
    return html`
      <style>
        ha-call-service-button {
          color: var(--primary-color);
          white-space: nowrap;
        }
      </style>
      <ha-call-service-button
        hass="[[hass]]"
        domain="[[_domain]]"
        service="[[_service]]"
        service-data="[[_config.service_data]]"
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

    const [domain, service] = config.service.split('.', 2);
    this.setProperties({
      _config: config,
      _domain: domain,
      _service: service
    });
  }
}
customElements.define('hui-service-button-element', HuiServiceButtonElement);

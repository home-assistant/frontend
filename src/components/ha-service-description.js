import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HaServiceDescription extends PolymerElement {
  static get template() {
    return html`
    [[_getDescription(hass, domain, service)]]
`;
  }

  static get is() { return 'ha-service-description'; }

  static get properties() {
    return {
      hass: Object,
      domain: String,
      service: String,
    };
  }

  _getDescription(hass, domain, service) {
    var domainServices = hass.config.services[domain];
    if (!domainServices) return '';
    var serviceObject = domainServices[service];
    if (!serviceObject) return '';
    return serviceObject.description;
  }
}

customElements.define(HaServiceDescription.is, HaServiceDescription);

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaServiceDescription extends PolymerElement {
  static get template() {
    return html`
      [[_getDescription(hass, domain, service)]]
    `;
  }

  static get properties() {
    return {
      hass: Object,
      domain: String,
      service: String,
    };
  }

  _getDescription(hass, domain, service) {
    var domainServices = hass.services[domain];
    if (!domainServices) return "";
    var serviceObject = domainServices[service];
    if (!serviceObject) return "";
    return serviceObject.description;
  }
}

customElements.define("ha-service-description", HaServiceDescription);

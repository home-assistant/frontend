import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../util/hass-mixins.js';
import './ha-combo-box.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaServicePicker extends window.hassMixins.LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <ha-combo-box label="[[localize('ui.components.service-picker.service')]]" items="[[_services]]" value="{{value}}" allow-custom-value=""></ha-combo-box>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged',
      },
      _services: Array,
      value: {
        type: String,
        notify: true,
      },
    };
  }

  _hassChanged(hass, oldHass) {
    if (!hass) {
      this._services = [];
      return;
    } else if (oldHass && hass.config.services === oldHass.config.services) {
      return;
    }
    const result = [];

    Object.keys(hass.config.services).sort().forEach((domain) => {
      const services = Object.keys(hass.config.services[domain]).sort();

      for (let i = 0; i < services.length; i++) {
        result.push(`${domain}.${services[i]}`);
      }
    });

    this._services = result;
  }
}

customElements.define('ha-service-picker', HaServicePicker);

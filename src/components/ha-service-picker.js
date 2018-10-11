import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "./ha-combo-box.js";

import LocalizeMixin from "../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class HaServicePicker extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <ha-combo-box label="[[localize('ui.components.service-picker.service')]]" items="[[_services]]" value="{{value}}" allow-custom-value=""></ha-combo-box>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
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
    }
    if (oldHass && hass.services === oldHass.services) {
      return;
    }
    const result = [];

    Object.keys(hass.services)
      .sort()
      .forEach((domain) => {
        const services = Object.keys(hass.services[domain]).sort();

        for (let i = 0; i < services.length; i++) {
          result.push(`${domain}.${services[i]}`);
        }
      });

    this._services = result;
  }
}

customElements.define("ha-service-picker", HaServicePicker);

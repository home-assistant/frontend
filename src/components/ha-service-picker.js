import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./ha-combo-box";

import LocalizeMixin from "../mixins/localize-mixin";
import EventsMixin from "../mixins/events-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HaServicePicker extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <ha-combo-box
        label="[[localize('ui.components.service-picker.service')]]"
        items="[[_services]]"
        value="{{value}}"
        allow-custom-value=""
        on-change="_fireChanged"
      ></ha-combo-box>
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

  _fireChanged(ev) {
    console.log("fire change");
    ev.stopPropagation();
    this.fire("change");
  }
}

customElements.define("ha-service-picker", HaServicePicker);

import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../resources/ha-style";

import EventsMixin from "../../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class HaLoadedComponents extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style-dialog">
        paper-dialog {
          max-width: 500px;
        }
      </style>
      <paper-dialog id="dialog" with-backdrop="" opened="{{_opened}}">
        <h2>Loaded Components</h2>
        <paper-dialog-scrollable id="scrollable">
          <p>The following components are currently loaded:</p>
          <ul>
            <template is="dom-repeat" items="[[_components]]">
              <li>[[item]]</li>
            </template>
          </ul>
        </paper-dialog-scrollable>
      </paper-dialog>
    `;
  }

  static get properties() {
    return {
      _hass: Object,
      _components: Array,

      _opened: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    super.ready();
  }

  showDialog({ hass }) {
    this.hass = hass;
    this._opened = true;
    this._components = this.hass.config.components.sort();
    setTimeout(() => this.$.dialog.center(), 0);
  }
}

customElements.define("ha-loaded-components", HaLoadedComponents);

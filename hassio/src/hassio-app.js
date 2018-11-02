import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hassio-main";
import "./resources/hassio-icons";

class HassioApp extends PolymerElement {
  static get template() {
    return html`
    <template is="dom-if" if="[[hass]]">
      <hassio-main hass="[[hass]]" narrow="[[narrow]]" show-menu="[[showMenu]]" route="[[route]]"></hassio-main>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      route: Object,
      hassioPanel: {
        type: Object,
        value: window.parent.hassioPanel,
      },
    };
  }

  ready() {
    super.ready();
    window.setProperties = this.setProperties.bind(this);
    this.addEventListener("location-changed", () => this._locationChanged());
    this.addEventListener("hass-open-menu", () => this._menuEvent(true));
    this.addEventListener("hass-close-menu", () => this._menuEvent(false));
  }

  _menuEvent(shouldOpen) {
    this.hassioPanel.fire(shouldOpen ? "hass-open-menu" : "hass-close-menu");
  }

  _locationChanged() {
    this.hassioPanel.navigate(window.location.pathname);
  }
}

customElements.define("hassio-app", HassioApp);

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../states/ha-panel-states";

class HaPanelKiosk extends PolymerElement {
  static get template() {
    return html`
      <ha-panel-states
        id="kiosk-states"
        hass="[[hass]]"
        show-menu
        route="[[route]]"
        panel-visible
      ></ha-panel-states>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      route: Object,
    };
  }
}

customElements.define("ha-panel-kiosk", HaPanelKiosk);

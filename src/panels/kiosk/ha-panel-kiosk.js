import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../layouts/partial-cards";

class HaPanelKiosk extends PolymerElement {
  static get template() {
    return html`
      <partial-cards
        id="kiosk-states"
        hass="[[hass]]"
        show-menu
        route="[[route]]"
        panel-visible
      ></partial-cards>
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

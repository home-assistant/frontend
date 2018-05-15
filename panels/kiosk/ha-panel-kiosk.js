import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../src/layouts/partial-cards.js';

class HaPanelKiosk extends PolymerElement {
  static get template() {
    return html`
    <partial-cards
      id='kiosk-states'
      hass='[[hass]]'
      show-menu
      route='[[route]]'
      panel-visible
    ></partial-cards>
    `;
  }
  static get is() { return 'ha-panel-kiosk'; }

  static get properties() {
    return {
      hass: Object,
      route: Object,
    };
  }
}

customElements.define(HaPanelKiosk.is, HaPanelKiosk);

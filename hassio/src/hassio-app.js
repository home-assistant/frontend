import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hassio-main";
import "./resources/hassio-icons";

class HassioApp extends PolymerElement {
  static get template() {
    return html`
      <template is="dom-if" if="[[hass]]">
        <hassio-main hass="[[hass]]" route="[[route]]"></hassio-main>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
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
    this.addEventListener("hass-toggle-menu", (ev) =>
      this.hassioPanel.fire("hass-toggle-menu", ev.detail)
    );
  }

  _locationChanged() {
    this.hassioPanel.navigate(window.location.pathname);
  }
}

customElements.define("hassio-app", HassioApp);

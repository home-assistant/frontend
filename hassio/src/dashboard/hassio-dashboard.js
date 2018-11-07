import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hassio-addons";
import "./hassio-hass-update";
import EventsMixin from "../../../src/mixins/events-mixin";

class HassioDashboard extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          margin: 0 auto;
        }
      </style>
      <div class="content">
        <hassio-hass-update
          hass="[[hass]]"
          hass-info="[[hassInfo]]"
        ></hassio-hass-update>
        <hassio-addons
          hass="[[hass]]"
          addons="[[supervisorInfo.addons]]"
        ></hassio-addons>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      supervisorInfo: Object,
      hassInfo: Object,
    };
  }
}

customElements.define("hassio-dashboard", HassioDashboard);

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hassio-addons.js';
import './hassio-hass-update.js';

class HassioDashboard extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        margin: 0 auto;
      }
    </style>
    <div class="content">
      <hassio-hass-update hass="[[hass]]" hass-info="[[hassInfo]]"></hassio-hass-update>
      <hassio-addons hass="[[hass]]" addons="[[supervisorInfo.addons]]"></hassio-addons>
    </div>
`;
  }

  static get is() { return 'hassio-dashboard'; }

  static get properties() {
    return {
      hass: Object,
      supervisorInfo: Object,
      hassInfo: Object,
    };
  }
}

customElements.define(HassioDashboard.is, HassioDashboard);

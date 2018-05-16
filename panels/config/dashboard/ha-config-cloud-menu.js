import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/util/hass-mixins.js';

class HaConfigCloudMenu extends window.hassMixins.NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex">
      paper-card {
        display: block;
      }
      paper-item {
        cursor: pointer;
      }
    </style>
    <paper-card>
      <paper-item on-click="_navigate">
        <paper-item-body two-line="">
          Home Assistant Cloud
          <template is="dom-if" if="[[account]]">
            <div secondary="">Logged in as [[account.email]]</div>
          </template>
          <template is="dom-if" if="[[!account]]">
            <div secondary="">Not logged in</div>
          </template>
        </paper-item-body>
        <iron-icon icon="mdi:chevron-right"></iron-icon>
      </paper-item>
    </paper-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      account: Object,
    };
  }

  _navigate() {
    this.navigate('/config/cloud');
  }
}

customElements.define('ha-config-cloud-menu', HaConfigCloudMenu);

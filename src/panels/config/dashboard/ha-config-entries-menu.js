import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import NavigateMixin from '../../../mixins/navigate-mixin.js';

/*
 * @appliesMixin NavigateMixin
 */
class HaConfigEntriesMenu extends NavigateMixin(PolymerElement) {
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
          Integrations
          <div secondary="">EXPERIMENTAL – Manage connected devices and services</div>
        </paper-item-body>
        <iron-icon icon="hass:chevron-right"></iron-icon>
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
    this.navigate('/config/integrations');
  }
}

customElements.define('ha-config-entries-menu', HaConfigEntriesMenu);

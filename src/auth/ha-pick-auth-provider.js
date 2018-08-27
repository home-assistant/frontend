import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-item-body.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import EventsMixin from '../mixins/events-mixin.js';
import localizeLiteMixin from '../mixins/localize-lite-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaPickAuthProvider extends EventsMixin(localizeLiteMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      paper-item {
        cursor: pointer;
      }
      p {
        margin-top: 0;
      }
    </style>
    <p>[[localize('ui.panel.page-authorize.pick_auth_provider')]]:</p>
    <template is="dom-repeat" items="[[authProviders]]">
      <paper-item on-click="_handlePick">
        <paper-item-body>[[item.name]]</paper-item-body>
        <iron-icon icon="hass:chevron-right"></iron-icon>
      </paper-item>
    </template>
`;
  }

  static get properties() {
    return {
      _state: {
        type: String,
        value: 'loading'
      },
      authProviders: Array,
    };
  }

  _handlePick(ev) {
    this.fire('pick', ev.model.item);
  }

  _equal(a, b) {
    return a === b;
  }
}
customElements.define('ha-pick-auth-provider', HaPickAuthProvider);

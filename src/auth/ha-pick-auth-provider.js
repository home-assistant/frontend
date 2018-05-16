import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../util/hass-mixins.js';

/*
 * @appliesMixin window.hassMixins.EventsMixin
 */
class HaPickAuthProvider extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        text-align: center;
        font-family: Roboto;
      }
      paper-item {
        cursor: pointer;
      }
    </style>
    <template is="dom-if" if="[[_equal(_state, &quot;loading&quot;)]]">
      Loading auth providers.
    </template>
    <template is="dom-if" if="[[_equal(_state, &quot;no-results&quot;)]]">
      No auth providers found.
    </template>
    <template is="dom-if" if="[[_equal(_state, &quot;error-loading&quot;)]]">
      Error loading
    </template>
    <template is="dom-if" if="[[_equal(_state, &quot;pick&quot;)]]">
      <p>Log in with</p>
      <template is="dom-repeat" items="[[authProviders]]">
        <paper-item on-click="_handlePick">[[item.name]]</paper-item>
      </template>
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
      clientId: String,
      clientSecret: String,
    };
  }
  connectedCallback() {
    super.connectedCallback();

    fetch('/auth/providers', {
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      }
    }).then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then((authProviders) => {
      this.setProperties({
        authProviders,
        _state: 'pick',
      });
      if (authProviders.length === 1) {
        this.fire('pick', authProviders[0]);
      }
    }).catch((err) => {
      // eslint-disable-next-line
      console.error('Error loading auth providers', err);
      this._state = 'error-loading';
    });
  }

  _handlePick(ev) {
    this.fire('pick', ev.model.item);
  }

  _equal(a, b) {
    return a === b;
  }
}
customElements.define('ha-pick-auth-provider', HaPickAuthProvider);

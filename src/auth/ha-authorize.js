import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../auth/ha-auth-flow.js';

class HaAuthorize extends PolymerElement {
  static get template() {
    return html`
    <style>
      ha-pick-auth-provider {
        display: block;
        margin-top: 48px;
      }
    </style>

    <template is="dom-if" if="[[!_authProviders]]">
      Initializing
    </template>

    <template is="dom-if" if="[[_authProviders]]">
      <p>Logging in to <b>[[clientId]]</b> with <b>[[_authProvider.name]]</b></p>

      <ha-auth-flow
        client-id="[[clientId]]"
        redirect-uri="[[redirectUri]]"
        oauth2-state="[[oauth2State]]"
        auth-provider="[[_authProvider]]"
        step="{{step}}"
      ></ha-auth-flow>

      <template is="dom-if" if="[[_computeMultiple(_authProviders)]]">
        <ha-pick-auth-provider
          client-id="[[clientId]]"
          auth-providers="[[_computeInactiveProvders(_authProvider, _authProviders)]]"
          on-pick="_handleAuthProviderPick"
        ></ha-pick-auth-provider>
      </template>
    </template>
`;
  }

  static get properties() {
    return {
      _authProvider: {
        type: String,
        value: null,
      },
      _authProviders: {
        type: Array,
        value: null,
      },
      _step: Object,
      clientId: String,
      redirectUri: String,
      oauth2State: String,
    };
  }

  async ready() {
    super.ready();
    const query = {};
    const values = location.search.substr(1).split('&');
    for (let i = 0; i < values.length; i++) {
      const value = values[i].split('=');
      if (value.length > 1) {
        query[decodeURIComponent(value[0])] = decodeURIComponent(value[1]);
      }
    }
    const props = {};
    if (query.client_id) props.clientId = query.client_id;
    if (query.redirect_uri) props.redirectUri = query.redirect_uri;
    if (query.state) props.oauth2State = query.state;
    this.setProperties(props);

    import(
      /* webpackChunkName: "pick-auth-provider" */
      '../auth/ha-pick-auth-provider.js');

    // Fetch auth providers
    try {
      const response = await window.providersPromise;
      const authProviders = await response.json();

      if (authProviders.length === 0) {
        alert('No auth providers returned. Unable to finish login.');
        return;
      }

      this.setProperties({
        _authProviders: authProviders,
        _authProvider: authProviders[0],
      });
    } catch(err) {
      // eslint-disable-next-line
      console.error('Error loading auth providers', err);
      this._state = 'error-loading';
    };
  }

  _computeMultiple(array) {
    return array && array.length > 1;
  }

  async _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }

  _computeInactiveProvders(curProvider, providers) {
    return providers.filter(prv =>
      prv.type !== curProvider.type || prv.id !== curProvider.id);
  }
}
customElements.define('ha-authorize', HaAuthorize);

import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/ha-iconset-svg.js';
import '../resources/roboto.js';

import '../auth/ha-auth-flow.js';
import '../auth/ha-pick-auth-provider.js';

class HaAuthorize extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning"></style>
    <style>
      .layout {
        padding-top: 20px;
      }
    </style>
    <div class="layout vertical center fit">
      <img src="/static/icons/favicon-192x192.png" height="192">

      <p>Logging in to <b>[[clientId]]</b>.</p>

      <template is="dom-if" if="[[_authProvider]]">
        <ha-auth-flow
          client-id="[[clientId]]"
          redirect-uri="[[redirectUri]]"
          oauth2-state="[[oauth2State]]"
          auth-provider="[[_authProvider]]"
          on-reset="_handleReset"
        ></ha-auth-flow>
      </template>
      <template is="dom-if" if="[[!_authProvider]]">
        <ha-pick-auth-provider
          client-id="[[clientId]]"
          on-pick="_handleAuthProviderPick"
        ></ha-pick-auth-provider>
      </template>
    </div>
`;
  }

  static get properties() {
    return {
      _authProvider: {
        type: String,
        value: null,
      },
      clientId: String,
      redirectUri: String,
      oauth2State: String,
    };
  }
  ready() {
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
  }
  _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }
  _handleReset() {
    this._authProvider = null;
  }
}
customElements.define('ha-authorize', HaAuthorize);

import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/ha-iconset-svg.js';
import '../resources/ha-style.js';
import '../resources/roboto.js';

import '../auth/ha-auth-flow.js';
import '../auth/ha-pick-auth-provider.js';

/* polyfill for paper-dropdown */
import(/* webpackChunkName: "polyfill-web-animations-next" */ 'web-animations-js/web-animations-next-lite.min.js');

class HaAuthorize extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning"></style>
    <style>
      .content {
        padding: 20px 16px;
        max-width: 360px;
        margin: 0 auto;
      }

      .header {
        text-align: center;
        font-size: 1.96em;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 300;
      }

      .header img {
        margin-right: 16px;
      }

    </style>
    <div class="content layout vertical fit">
      <div class='header'>
        <img src="/static/icons/favicon-192x192.png" height="52">
        Home Assistant
      </div>

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

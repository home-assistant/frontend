import "@polymer/polymer/lib/elements/dom-if";
import "@polymer/polymer/lib/elements/dom-repeat";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/ha-markdown";

import LocalizeLiteMixin from "../mixins/localize-lite-mixin";

import "./ha-auth-flow";

class HaAuthorize extends LocalizeLiteMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      ha-markdown {
        display: block;
        margin-bottom: 16px;
      }
      ha-markdown a {
        color: var(--primary-color);
      }
      ha-markdown p:last-child{
        margin-bottom: 0;
      }
      ha-pick-auth-provider {
        display: block;
        margin-top: 48px;
      }
    </style>

    <template is="dom-if" if="[[!_authProviders]]">
      <p>[[localize('ui.panel.page-authorize.initializing')]]</p>
    </template>

    <template is="dom-if" if="[[_authProviders]]">
      <ha-markdown content='[[_computeIntro(localize, clientId, _authProvider)]]'></ha-markdown>

      <ha-auth-flow
        resources="[[resources]]"
        client-id="[[clientId]]"
        redirect-uri="[[redirectUri]]"
        oauth2-state="[[oauth2State]]"
        auth-provider="[[_authProvider]]"
        step="{{step}}"
      ></ha-auth-flow>

      <template is="dom-if" if="[[_computeMultiple(_authProviders)]]">
        <ha-pick-auth-provider
          resources="[[resources]]"
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
      _authProvider: String,
      _authProviders: Array,
      clientId: String,
      redirectUri: String,
      oauth2State: String,
      translationFragment: {
        type: String,
        value: "page-authorize",
      },
    };
  }

  async ready() {
    super.ready();
    const query = {};
    const values = location.search.substr(1).split("&");
    for (let i = 0; i < values.length; i++) {
      const value = values[i].split("=");
      if (value.length > 1) {
        query[decodeURIComponent(value[0])] = decodeURIComponent(value[1]);
      }
    }
    const props = {};
    if (query.client_id) props.clientId = query.client_id;
    if (query.redirect_uri) props.redirectUri = query.redirect_uri;
    if (query.state) props.oauth2State = query.state;
    this.setProperties(props);

    import(/* webpackChunkName: "pick-auth-provider" */ "../auth/ha-pick-auth-provider");

    // Fetch auth providers
    try {
      const response = await window.providersPromise;
      const authProviders = await response.json();

      // Forward to main screen which will redirect to right onboarding page.
      if (
        response.status === 400 &&
        authProviders.code === "onboarding_required"
      ) {
        location.href = "/";
        return;
      }

      if (authProviders.length === 0) {
        alert("No auth providers returned. Unable to finish login.");
        return;
      }

      this.setProperties({
        _authProviders: authProviders,
        _authProvider: authProviders[0],
      });
    } catch (err) {
      // eslint-disable-next-line
      console.error("Error loading auth providers", err);
      this._state = "error-loading";
    }
  }

  _computeMultiple(array) {
    return array && array.length > 1;
  }

  async _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }

  _computeInactiveProvders(curProvider, providers) {
    return providers.filter(
      (prv) => prv.type !== curProvider.type || prv.id !== curProvider.id
    );
  }

  _computeIntro(localize, clientId, authProvider) {
    return (
      localize(
        "ui.panel.page-authorize.authorizing_client",
        "clientId",
        clientId
      ) +
      "\n\n" +
      localize(
        "ui.panel.page-authorize.logging_in_with",
        "authProviderName",
        authProvider.name
      )
    );
  }
}
customElements.define("ha-authorize", HaAuthorize);

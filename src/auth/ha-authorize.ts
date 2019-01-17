import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { LitElement, html, PropertyDeclarations } from "lit-element";
import "./ha-auth-flow";
import { AuthProvider } from "../data/auth";

import(/* webpackChunkName: "pick-auth-provider" */ "../auth/ha-pick-auth-provider");

interface QueryParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
}

class HaAuthorize extends litLocalizeLiteMixin(LitElement) {
  public clientId?: string;
  public redirectUri?: string;
  public oauth2State?: string;
  private _authProvider?: AuthProvider;
  private _authProviders?: AuthProvider[];

  constructor() {
    super();
    this.translationFragment = "page-authorize";
    const query: QueryParams = {};
    const values = location.search.substr(1).split("&");
    for (const item of values) {
      const value = item.split("=");
      if (value.length > 1) {
        query[decodeURIComponent(value[0])] = decodeURIComponent(value[1]);
      }
    }
    if (query.client_id) {
      this.clientId = query.client_id;
    }
    if (query.redirect_uri) {
      this.redirectUri = query.redirect_uri;
    }
    if (query.state) {
      this.oauth2State = query.state;
    }
  }

  static get properties(): PropertyDeclarations {
    return {
      _authProvider: {},
      _authProviders: {},
      clientId: {},
      redirectUri: {},
      oauth2State: {},
    };
  }

  protected render() {
    if (!this._authProviders) {
      return html`
        <p>[[localize('ui.panel.page-authorize.initializing')]]</p>
      `;
    }

    // We don't have a good approach yet to map text markup in localization.
    // So we sanitize the translation with innerText and then inject
    // the name with a bold tag.
    const loggingInWith = document.createElement("div");
    loggingInWith.innerText = this.localize(
      "ui.panel.page-authorize.logging_in_with",
      "authProviderName",
      "NAME"
    );
    loggingInWith.innerHTML = loggingInWith.innerHTML.replace(
      "**NAME**",
      `<b>${this._authProvider!.name}</b>`
    );

    const inactiveProviders = this._authProviders.filter(
      (prv) => prv !== this._authProvider
    );

    return html`
      ${this.renderStyle()}
      <p>
        ${
          this.localize(
            "ui.panel.page-authorize.authorizing_client",
            "clientId",
            this.clientId
          )
        }
      </p>
      ${loggingInWith}

      <ha-auth-flow
        .resources="${this.resources}"
        .clientId="${this.clientId}"
        .redirectUri="${this.redirectUri}"
        .oauth2State="${this.oauth2State}"
        .authProvider="${this._authProvider}"
        .step="{{step}}"
      ></ha-auth-flow>

      ${
        inactiveProviders.length > 0
          ? html`
              <ha-pick-auth-provider
                .resources="${this.resources}"
                .clientId="${this.clientId}"
                .authProviders="${inactiveProviders}"
                @pick="${this._handleAuthProviderPick}"
              ></ha-pick-auth-provider>
            `
          : ""
      }
    `;
  }

  public async firstUpdated() {
    // Fetch auth providers
    try {
      const response = await (window as any).providersPromise;
      const authProviders = await response.json();

      // Forward to main screen which will redirect to right onboarding page.
      if (
        response.status === 400 &&
        authProviders.code === "onboarding_required"
      ) {
        location.href = "/?";
        return;
      }

      if (authProviders.length === 0) {
        alert("No auth providers returned. Unable to finish login.");
        return;
      }

      this._authProviders = authProviders;
      this._authProvider = authProviders[0];
    } catch (err) {
      // tslint:disable-next-line
      console.error("Error loading auth providers", err);
    }
  }

  protected renderStyle() {
    return html`
      <style>
        ha-pick-auth-provider {
          display: block;
          margin-top: 48px;
        }
      </style>
    `;
  }

  private async _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }
}
customElements.define("ha-authorize", HaAuthorize);

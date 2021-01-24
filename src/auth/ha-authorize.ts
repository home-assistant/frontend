import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import punycode from "punycode";
import { extractSearchParamsObject } from "../common/url/search-params";
import {
  AuthProvider,
  AuthUrlSearchParams,
  fetchAuthProviders,
} from "../data/auth";
import {
  DiscoveryInformation,
  fetchDiscoveryInformation,
} from "../data/discovery";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { registerServiceWorker } from "../util/register-service-worker";
import "./ha-auth-flow";

import("./ha-pick-auth-provider");

class HaAuthorize extends litLocalizeLiteMixin(LitElement) {
  @property() public clientId?: string;

  @property() public redirectUri?: string;

  @property() public oauth2State?: string;

  @internalProperty() private _authProvider?: AuthProvider;

  @internalProperty() private _authProviders?: AuthProvider[];

  @internalProperty() private _discovery?: DiscoveryInformation;

  constructor() {
    super();
    this.translationFragment = "page-authorize";
    const query = extractSearchParamsObject() as AuthUrlSearchParams;
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

  protected render() {
    if (!this._authProviders) {
      return html`
        <p>${this.localize("ui.panel.page-authorize.initializing")}</p>
      `;
    }

    // We don't have a good approach yet to map text markup in localization.
    // So we sanitize the translation with innerText and then inject
    // the name with a bold tag.
    const loggingInWith = document.createElement("div");
    loggingInWith.innerText = this.localize(
      this._discovery?.location_name
        ? "ui.panel.page-authorize.logging_in_to_with"
        : "ui.panel.page-authorize.logging_in_with",
      "locationName",
      "LOCATION",
      "authProviderName",
      "NAME"
    );
    loggingInWith.innerHTML = loggingInWith.innerHTML
      .replace("**LOCATION**", `<b>${this._discovery?.location_name}</b>`)
      .replace("**NAME**", `<b>${this._authProvider!.name}</b>`);

    const inactiveProviders = this._authProviders.filter(
      (prv) => prv !== this._authProvider
    );

    return html`
      <p>
        ${this.localize(
          "ui.panel.page-authorize.authorizing_client",
          "clientId",
          this.clientId ? punycode.toASCII(this.clientId) : this.clientId
        )}
      </p>
      ${loggingInWith}

      <ha-auth-flow
        .resources="${this.resources}"
        .clientId="${this.clientId}"
        .redirectUri="${this.redirectUri}"
        .oauth2State="${this.oauth2State}"
        .authProvider="${this._authProvider}"
      ></ha-auth-flow>

      ${inactiveProviders.length > 0
        ? html`
            <ha-pick-auth-provider
              .resources="${this.resources}"
              .clientId="${this.clientId}"
              .authProviders="${inactiveProviders}"
              @pick-auth-provider="${this._handleAuthProviderPick}"
            ></ha-pick-auth-provider>
          `
        : ""}
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchAuthProviders();
    this._fetchDiscoveryInfo();

    if (!this.redirectUri) {
      return;
    }

    // If we are logging into the instance that is hosting this auth form
    // we will register the service worker to start preloading.
    const tempA = document.createElement("a");
    tempA.href = this.redirectUri!;
    if (tempA.host === location.host) {
      registerServiceWorker(this, false);
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("language")) {
      document.querySelector("html")!.setAttribute("lang", this.language!);
    }
  }

  private async _fetchDiscoveryInfo() {
    this._discovery = await fetchDiscoveryInformation();
  }

  private async _fetchAuthProviders() {
    // Fetch auth providers
    try {
      // We prefetch this data on page load in authorize.html.template for modern builds
      const response = await ((window as any).providersPromise ||
        fetchAuthProviders());
      const authProviders = await response.json();

      // Forward to main screen which will redirect to right onboarding page.
      if (
        response.status === 400 &&
        authProviders.code === "onboarding_required"
      ) {
        location.href = `/onboarding.html${location.search}`;
        return;
      }

      if (authProviders.length === 0) {
        alert("No auth providers returned. Unable to finish login.");
        return;
      }

      this._authProviders = authProviders;
      this._authProvider = authProviders[0];
    } catch (err) {
      // eslint-disable-next-line
      console.error("Error loading auth providers", err);
    }
  }

  private async _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }

  static get styles(): CSSResult {
    return css`
      ha-pick-auth-provider {
        display: block;
        margin-top: 48px;
      }
    `;
  }
}
customElements.define("ha-authorize", HaAuthorize);

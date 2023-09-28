/* eslint-disable lit/prefer-static-styles */
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import punycode from "punycode";
import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import { extractSearchParamsObject } from "../common/url/search-params";
import "../components/ha-alert";
import {
  AuthProvider,
  AuthUrlSearchParams,
  fetchAuthProviders,
} from "../data/auth";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { registerServiceWorker } from "../util/register-service-worker";
import "./ha-auth-flow";

import("./ha-pick-auth-provider");

const appNames = {
  "https://home-assistant.io/iOS": "iOS",
  "https://home-assistant.io/android": "Android",
};

@customElement("ha-authorize")
export class HaAuthorize extends litLocalizeLiteMixin(LitElement) {
  @property() public clientId?: string;

  @property() public redirectUri?: string;

  @property() public oauth2State?: string;

  @property() public translationFragment = "page-authorize";

  @state() private _authProvider?: AuthProvider;

  @state() private _authProviders?: AuthProvider[];

  @state() private _ownInstance = false;

  @state() private _error?: string;

  constructor() {
    super();
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
    if (this._error) {
      return html`
        <style>
          ha-authorize ha-alert {
            display: block;
            margin: 16px 0;
          }
        </style>
        <ha-alert alert-type="error"
          >${this._error} ${this.redirectUri}</ha-alert
        >
      `;
    }

    if (!this._authProviders) {
      return html`
        <style>
          ha-authorize p {
            font-size: 14px;
            line-height: 20px;
          }
        </style>
        <p>${this.localize("ui.panel.page-authorize.initializing")}</p>
      `;
    }

    const inactiveProviders = this._authProviders.filter(
      (prv) => prv !== this._authProvider
    );

    const app = this.clientId && this.clientId in appNames;

    return html`
      <style>
        ha-pick-auth-provider {
          display: block;
          margin-top: 48px;
        }
        ha-auth-flow {
          display: block;
          margin-top: 24px;
        }
        ha-alert {
          display: block;
          margin: 16px 0;
        }
        p {
          font-size: 14px;
          line-height: 20px;
        }
      </style>

      ${!this._ownInstance
        ? html`<ha-alert .alertType=${app ? "info" : "warning"}>
            ${app
              ? this.localize("ui.panel.page-authorize.authorizing_app", {
                  app: appNames[this.clientId!],
                })
              : this.localize("ui.panel.page-authorize.authorizing_client", {
                  clientId: html`<b
                    >${this.clientId
                      ? punycode.toASCII(this.clientId)
                      : this.clientId}</b
                  >`,
                })}
          </ha-alert>`
        : html`<p>${this.localize("ui.panel.page-authorize.authorizing")}</p>`}
      ${inactiveProviders.length > 0
        ? html`<p>
            ${this.localize("ui.panel.page-authorize.logging_in_with", {
              authProviderName: html`<b>${this._authProvider!.name}</b>`,
            })}
          </p>`
        : nothing}

      <ha-auth-flow
        .clientId=${this.clientId}
        .redirectUri=${this.redirectUri}
        .oauth2State=${this.oauth2State}
        .authProvider=${this._authProvider}
        .localize=${this.localize}
      ></ha-auth-flow>

      ${inactiveProviders.length > 0
        ? html`
            <ha-pick-auth-provider
              .localize=${this.localize}
              .clientId=${this.clientId}
              .authProviders=${inactiveProviders}
              @pick-auth-provider=${this._handleAuthProviderPick}
            ></ha-pick-auth-provider>
          `
        : ""}
    `;
  }

  createRenderRoot() {
    return this;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (!this.redirectUri) {
      this._error = "Invalid redirect URI";
      return;
    }

    let url: URL;

    try {
      url = new URL(this.redirectUri);
    } catch (err) {
      this._error = "Invalid redirect URI";
      return;
    }

    if (
      // eslint-disable-next-line no-script-url
      ["javascript:", "data:", "vbscript:", "file:", "about:"].includes(
        url.protocol
      )
    ) {
      this._error = "Invalid redirect URI";
      return;
    }

    this._fetchAuthProviders();

    if (matchMedia("(prefers-color-scheme: dark)").matches) {
      applyThemesOnElement(
        document.documentElement,
        {
          default_theme: "default",
          default_dark_theme: null,
          themes: {},
          darkMode: true,
          theme: "default",
        },
        undefined,
        undefined,
        true
      );
    }

    // If we are logging into the instance that is hosting this auth form
    // we will register the service worker to start preloading.
    if (url.host === location.host) {
      this._ownInstance = true;
      registerServiceWorker(this, false);
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("language")) {
      document.querySelector("html")!.setAttribute("lang", this.language!);
    }
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
        this._error = "No auth providers returned. Unable to finish login.";
        return;
      }

      this._authProviders = authProviders;
      this._authProvider = authProviders[0];
    } catch (err: any) {
      this._error = "Unable to fetch auth providers.";
      // eslint-disable-next-line
      console.error("Error loading auth providers", err);
    }
  }

  private async _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }
}

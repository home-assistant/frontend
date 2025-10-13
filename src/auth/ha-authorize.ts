/* eslint-disable lit/prefer-static-styles */
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import punycode from "punycode";
import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import { extractSearchParamsObject } from "../common/url/search-params";
import "../components/ha-alert";
import type { AuthProvider, AuthUrlSearchParams } from "../data/auth";
import { fetchAuthProviders } from "../data/auth";
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
  @property({ attribute: false }) public clientId?: string;

  @property({ attribute: false }) public redirectUri?: string;

  @property({ attribute: false }) public oauth2State?: string;

  @property({ attribute: false }) public translationFragment = "page-authorize";

  @state() private _authProvider?: AuthProvider;

  @state() private _authProviders?: AuthProvider[];

  @state() private _preselectStoreToken = false;

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
            background-color: var(--primary-background-color, #fafafa);
          }
        </style>
        <ha-alert alert-type="error"
          >${this._error} ${this.redirectUri}</ha-alert
        >
      `;
    }

    const inactiveProviders = this._authProviders?.filter(
      (prv) => prv !== this._authProvider
    );

    const app = this.clientId && this.clientId in appNames;

    return html`
      <style>
        ha-pick-auth-provider {
          display: block;
          margin-top: 24px;
        }
        ha-auth-flow {
          display: flex;
          justify-content: center;
          flex-direction: column;
          align-items: center;
        }
        ha-alert {
          display: block;
          margin: 16px 0;
          background-color: var(--primary-background-color, #fafafa);
        }
        p {
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-normal);
        }
        .card-content {
          background: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          box-shadow: var(--ha-card-box-shadow, none);
          box-sizing: border-box;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          border-width: var(--ha-card-border-width, 1px);
          border-style: solid;
          border-color: var(
            --ha-card-border-color,
            var(--divider-color, #e0e0e0)
          );
          color: var(--primary-text-color);
          position: relative;
          padding: 16px;
        }
        .action {
          margin: 16px 0 8px;
          display: flex;
          width: 100%;
          max-width: 336px;
          justify-content: center;
        }
        .space-between {
          justify-content: space-between;
        }
        .footer {
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        ha-language-picker {
          width: 200px;
          border-radius: var(--ha-border-radius-sm);
          overflow: hidden;
          --ha-select-height: 40px;
          --mdc-select-fill-color: none;
          --mdc-select-label-ink-color: var(--primary-text-color, #212121);
          --mdc-select-ink-color: var(--primary-text-color, #212121);
          --mdc-select-idle-line-color: transparent;
          --mdc-select-hover-line-color: transparent;
          --mdc-select-dropdown-icon-color: var(--primary-text-color, #212121);
          --mdc-shape-small: 0;
        }
        .footer a {
          text-decoration: none;
          color: var(--primary-text-color);
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }
        h1 {
          font-size: var(--ha-font-size-3xl);
          font-weight: var(--ha-font-weight-normal);
          margin-top: 16px;
          margin-bottom: 16px;
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
        : nothing}

      <div class="card-content">
        ${!this._authProvider
          ? html`<p>
              ${this.localize("ui.panel.page-authorize.initializing")}
            </p> `
          : html`<ha-auth-flow
                .clientId=${this.clientId}
                .redirectUri=${this.redirectUri}
                .oauth2State=${this.oauth2State}
                .authProvider=${this._authProvider}
                .localize=${this.localize}
                .initStoreToken=${this._preselectStoreToken}
              ></ha-auth-flow>
              ${inactiveProviders!.length > 0
                ? html`
                    <ha-pick-auth-provider
                      .localize=${this.localize}
                      .clientId=${this.clientId}
                      .authProviders=${inactiveProviders!}
                      @pick-auth-provider=${this._handleAuthProviderPick}
                    ></ha-pick-auth-provider>
                  `
                : ""}`}
      </div>
      <div class="footer">
        <ha-language-picker
          .value=${this.language}
          .label=${""}
          native-name
          @value-changed=${this._languageChanged}
          inline-arrow
        ></ha-language-picker>
        <a
          href="https://www.home-assistant.io/docs/authentication/"
          target="_blank"
          rel="noreferrer noopener"
          >${this.localize("ui.panel.page-authorize.help")}</a
        >
      </div>
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
    } catch (_err) {
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

    if (
      window.innerWidth > 450 &&
      !matchMedia("(prefers-reduced-motion)").matches
    ) {
      import("../resources/particles");
    }

    // If we are logging into the instance that is hosting this auth form
    // we will register the service worker to start preloading.
    if (url.host === location.host) {
      this._ownInstance = true;
      registerServiceWorker(this, false);
    }

    import("../components/ha-language-picker");
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

      if (authProviders.providers.length === 0) {
        this._error = "No auth providers returned. Unable to finish login.";
        return;
      }

      this._authProviders = authProviders.providers;
      this._authProvider = authProviders.providers[0];
      this._preselectStoreToken = authProviders.preselect_remember_me;
    } catch (err: any) {
      this._error = "Unable to fetch auth providers.";
      // eslint-disable-next-line
      console.error("Error loading auth providers", err);
    }
  }

  private async _handleAuthProviderPick(ev) {
    this._authProvider = ev.detail;
  }

  private _languageChanged(ev: CustomEvent) {
    const language = ev.detail.value;
    this.language = language;

    try {
      window.localStorage.setItem("selectedLanguage", JSON.stringify(language));
    } catch (_err: any) {
      // Ignore
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-authorize": HaAuthorize;
  }
}

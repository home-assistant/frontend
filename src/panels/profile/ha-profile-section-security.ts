import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../layouts/hass-tabs-subpage";
import { profileSections } from "./ha-panel-profile";
import type { RefreshToken } from "../../data/refresh_token";
import type { AuthProvider } from "../../data/auth";
import { fetchAuthProviders } from "../../data/auth";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./ha-change-password-card";
import "./ha-long-lived-access-tokens-card";
import "./ha-mfa-modules-card";
import "./ha-refresh-tokens-card";
import "./ha-setup-passkey-card";
import type { Passkey } from "../../data/webauthn";

@customElement("ha-profile-section-security")
class HaProfileSectionSecurity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _refreshTokens?: RefreshToken[];

  @state() private _authProviders?: AuthProvider[];

  @state() private _passkeys?: Passkey[];

  @property({ attribute: false }) public route!: Route;

  public connectedCallback() {
    super.connectedCallback();
    this._refreshRefreshTokens();
    this._fetchAuthProviders();
  }

  public firstUpdated() {
    if (!this._refreshTokens) {
      this._refreshRefreshTokens();
    }
    if (!this._authProviders) {
      this._fetchAuthProviders();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        main-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${profileSections}
        .route=${this.route}
      >
        <div slot="title">${this.hass.localize("panel.profile")}</div>
        <div class="content">
          ${this.hass.user!.credentials.some(
            (cred) => cred.auth_provider_type === "homeassistant"
          )
            ? html`
                <ha-change-password-card
                  .refreshTokens=${this._refreshTokens}
                  @hass-refresh-tokens=${this._refreshRefreshTokens}
                  .hass=${this.hass}
                ></ha-change-password-card>
              `
            : ""}
          ${this._authProviders?.some(
            (provider) => provider.type === "webauthn"
          )
            ? html`
                <ha-setup-passkey-card
                  .hass=${this.hass}
                  .passkeys=${this._passkeys}
                  @hass-refresh-passkeys=${this._refreshPasskeys}
                ></ha-setup-passkey-card>
              `
            : ""}

          <ha-mfa-modules-card
            .hass=${this.hass}
            .mfaModules=${this.hass.user!.mfa_modules}
          ></ha-mfa-modules-card>

          <ha-refresh-tokens-card
            .hass=${this.hass}
            .refreshTokens=${this._refreshTokens}
            @hass-refresh-tokens=${this._refreshRefreshTokens}
          ></ha-refresh-tokens-card>

          <ha-long-lived-access-tokens-card
            .hass=${this.hass}
            .refreshTokens=${this._refreshTokens}
            @hass-refresh-tokens=${this._refreshRefreshTokens}
          ></ha-long-lived-access-tokens-card>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private async _refreshRefreshTokens() {
    if (!this.hass) {
      return;
    }
    this._refreshTokens = await this.hass.callWS({
      type: "auth/refresh_tokens",
    });
  }

  private async _refreshPasskeys() {
    if (!this.hass) {
      return;
    }
    this._passkeys = await this.hass.callWS<Passkey[]>({
      type: "config/auth_provider/passkey/list",
    });
  }

  private async _fetchAuthProviders() {
    if (!this.hass) {
      return;
    }

    const response = await ((window as any).providersPromise ||
      fetchAuthProviders());
    const authProviders = await response.json();
    this._authProviders = authProviders.providers;

    if (
      !this._passkeys &&
      this._authProviders?.some((provider) => provider.type === "webauthn")
    ) {
      this._refreshPasskeys();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .content > * {
          display: block;
          margin: 24px 0;
        }

        .promo-advanced {
          text-align: center;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-section-security": HaProfileSectionSecurity;
  }
}

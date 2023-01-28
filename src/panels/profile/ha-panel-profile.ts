import "@material/mwc-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-menu-button";
import { isExternal } from "../../data/external";
import {
  CoreFrontendUserData,
  getOptimisticFrontendUserDataCollection,
} from "../../data/frontend";
import { RefreshToken } from "../../data/refresh_token";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "./ha-advanced-mode-row";
import "./ha-change-password-card";
import "./ha-enable-shortcuts-row";
import "./ha-force-narrow-row";
import "./ha-long-lived-access-tokens-card";
import "./ha-mfa-modules-card";
import "./ha-pick-dashboard-row";
import "./ha-pick-first-weekday-row";
import "./ha-pick-language-row";
import "./ha-pick-number-format-row";
import "./ha-pick-theme-row";
import "./ha-pick-time-format-row";
import "./ha-push-notifications-row";
import "./ha-refresh-tokens-card";
import "./ha-set-suspend-row";
import "./ha-set-vibrate-row";

@customElement("ha-panel-profile")
class HaPanelProfile extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _refreshTokens?: RefreshToken[];

  @state() private _coreUserData?: CoreFrontendUserData | null;

  private _unsubCoreData?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    this._refreshRefreshTokens();
    this._unsubCoreData = getOptimisticFrontendUserDataCollection(
      this.hass.connection,
      "core"
    ).subscribe((coreUserData) => {
      this._coreUserData = coreUserData;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubCoreData) {
      this._unsubCoreData();
      this._unsubCoreData = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.profile")}</div>
          </app-toolbar>
        </app-header>

        <div class="content">
          <ha-card .header=${this.hass.user!.name}>
            <div class="card-content">
              ${this.hass.localize("ui.panel.profile.current_user", {
                fullName: this.hass.user!.name,
              })}
              ${this.hass.user!.is_owner
                ? this.hass.localize("ui.panel.profile.is_owner")
                : ""}
            </div>

            <ha-pick-language-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-language-row>
            <ha-pick-number-format-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-number-format-row>
            <ha-pick-time-format-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-time-format-row>
            <ha-pick-first-weekday-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-first-weekday-row>
            <ha-pick-theme-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-theme-row>
            <ha-pick-dashboard-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-dashboard-row>
            <ha-settings-row .narrow=${this.narrow}>
              <span slot="heading">
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.header"
                )}
              </span>
              <span slot="description">
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.description"
                )}
              </span>
              <mwc-button @click=${this._customizeSidebar}>
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.button"
                )}
              </mwc-button>
            </ha-settings-row>
            ${this.hass.dockedSidebar !== "auto" || !this.narrow
              ? html`
                  <ha-force-narrow-row
                    .narrow=${this.narrow}
                    .hass=${this.hass}
                  ></ha-force-narrow-row>
                `
              : ""}
            ${"vibrate" in navigator
              ? html`
                  <ha-set-vibrate-row
                    .narrow=${this.narrow}
                    .hass=${this.hass}
                  ></ha-set-vibrate-row>
                `
              : ""}
            ${!isExternal
              ? html`
                  <ha-push-notifications-row
                    .narrow=${this.narrow}
                    .hass=${this.hass}
                  ></ha-push-notifications-row>
                `
              : ""}
            ${this.hass.user!.is_admin
              ? html`
                  <ha-advanced-mode-row
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .coreUserData=${this._coreUserData}
                  ></ha-advanced-mode-row>
                `
              : ""}
            <ha-set-suspend-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-set-suspend-row>
            <ha-enable-shortcuts-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-enable-shortcuts-row>
            <div class="card-actions">
              <mwc-button class="warning" @click=${this._handleLogOut}>
                ${this.hass.localize("ui.panel.profile.logout")}
              </mwc-button>
            </div>
          </ha-card>

          ${this.hass.user!.credentials.some(
            (cred) => cred.auth_provider_type === "homeassistant"
          )
            ? html`
                <ha-change-password-card
                  .hass=${this.hass}
                ></ha-change-password-card>
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
      </ha-app-layout>
    `;
  }

  private _customizeSidebar() {
    fireEvent(this, "hass-edit-sidebar", { editMode: true });
  }

  private async _refreshRefreshTokens() {
    this._refreshTokens = await this.hass.callWS({
      type: "auth/refresh_tokens",
    });
  }

  private _handleLogOut() {
    showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.profile.logout_title"),
      text: this.hass.localize("ui.panel.profile.logout_text"),
      confirmText: this.hass.localize("ui.panel.profile.logout"),
      confirm: () => fireEvent(this, "hass-logout"),
    });
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
    "ha-panel-profile": HaPanelProfile;
  }
}

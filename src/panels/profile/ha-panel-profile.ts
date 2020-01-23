import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@material/mwc-button";
import "@polymer/app-layout/app-toolbar/app-toolbar";

import "../../components/ha-card";
import "../../components/ha-menu-button";
import "../../resources/ha-style";

import {
  getOptimisticFrontendUserDataCollection,
  CoreFrontendUserData,
} from "../../data/frontend";

import "./ha-change-password-card";
import "./ha-mfa-modules-card";
import "./ha-advanced-mode-card";
import "./ha-refresh-tokens-card";
import "./ha-long-lived-access-tokens-card";

import "./ha-pick-language-row";
import "./ha-pick-theme-row";
import "./ha-push-notifications-row";
import "./ha-force-narrow-row";
import "./ha-set-vibrate-row";
import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  property,
} from "lit-element";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";

class HaPanelProfile extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() private _refreshTokens?: unknown[];
  @property() private _coreUserData?: CoreFrontendUserData | null;
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

  protected render(): TemplateResult | void {
    return html`
      <app-header-layout has-scrolling-region>
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
              ${this.hass.localize(
                "ui.panel.profile.current_user",
                "fullName",
                this.hass.user!.name
              )}
              ${this.hass.user!.is_owner
                ? this.hass.localize("ui.panel.profile.is_owner")
                : ""}
            </div>

            <ha-pick-language-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-language-row>
            <ha-pick-theme-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-theme-row>
            ${this.hass.dockedSidebar !== "auto" || !this.narrow
              ? html`
                  <ha-force-narrow-row
                    .narrow=${this.narrow}
                    .hass=${this.hass}
                  ></ha-force-narrow-row>
                `
              : ""}
            ${navigator.vibrate
              ? html`
                  <ha-set-vibrate-row
                    .narrow=${this.narrow}
                    .hass=${this.hass}
                  ></ha-set-vibrate-row>
                `
              : ""}
            <ha-push-notifications-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-push-notifications-row>

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

          ${this.hass.user!.is_admin
            ? html`
                <ha-advanced-mode-card
                  .hass=${this.hass}
                  .coreUserData=${this._coreUserData}
                ></ha-advanced-mode-card>
              `
            : ""}

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
      </app-header-layout>
    `;
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
      confirmBtnText: this.hass.localize("ui.panel.profile.logout"),
      confirm: () => fireEvent(this, "hass-logout"),
    });
  }

  static get styles(): CSSResultArray {
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

customElements.define("ha-panel-profile", HaPanelProfile);

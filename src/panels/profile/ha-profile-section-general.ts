import { mdiAlertCircleOutline } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-button";
import "../../components/ha-expansion-panel";
import "../../components/ha-switch";
import "../../components/ha-svg-icon";
import "../../layouts/hass-tabs-subpage";
import { profileSections } from "./ha-panel-profile";
import { isExternal } from "../../data/external";
import { SELECTED_THEME_KEY } from "../../data/ws-themes";
import type { CoreFrontendUserData } from "../../data/frontend";
import { getOptimisticFrontendUserDataCollection } from "../../data/frontend";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route, ThemeSettings } from "../../types";
import "./ha-advanced-mode-row";
import "./ha-enable-shortcuts-row";
import "./ha-force-narrow-row";
import "./ha-pick-dashboard-row";
import "./ha-pick-first-weekday-row";
import "./ha-pick-language-row";
import "./ha-pick-number-format-row";
import "./ha-pick-theme-row";
import "./ha-pick-time-format-row";
import "./ha-pick-date-format-row";
import "./ha-pick-time-zone-row";
import "./ha-push-notifications-row";
import "./ha-set-suspend-row";
import "./ha-set-vibrate-row";
import { storage } from "../../common/decorators/storage";
import type { HaSwitch } from "../../components/ha-switch";

@customElement("ha-profile-section-general")
class HaProfileSectionGeneral extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _coreUserData?: CoreFrontendUserData | null;

  @property({ attribute: false }) public route!: Route;

  @storage({
    key: SELECTED_THEME_KEY,
    state: true,
    subscribe: true,
  })
  private _browserThemeSettings?: ThemeSettings;

  @state() private _browserThemeActivated = false;

  private _unsubCoreData?: UnsubscribeFunc;

  private _getCoreData() {
    this._unsubCoreData = getOptimisticFrontendUserDataCollection(
      this.hass.connection,
      "core"
    ).subscribe((coreUserData) => {
      this._coreUserData = coreUserData;
    });
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hass) {
      this._getCoreData();
    }
  }

  public firstUpdated() {
    if (!this._unsubCoreData) {
      this._getCoreData();
    }
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
      <hass-tabs-subpage
        main-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${profileSections}
        .route=${this.route}
      >
        <div slot="title">${this.hass.localize("panel.profile")}</div>
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
            <div class="card-actions">
              <ha-button class="warning" @click=${this._handleLogOut}>
                ${this.hass.localize("ui.panel.profile.logout")}
              </ha-button>
            </div>
          </ha-card>
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.profile.user_settings_header"
            )}
          >
            <div class="card-content">
              ${this.hass.localize("ui.panel.profile.user_settings_detail")}
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
            <ha-pick-date-format-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-date-format-row>
            <ha-pick-time-zone-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-time-zone-row>
            <ha-pick-first-weekday-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-first-weekday-row>
            ${this._browserThemeSettings || this._browserThemeActivated
              ? html`
                  <ha-settings-row .narrow=${this.narrow}>
                    <span slot="heading">
                      ${this.hass.localize("ui.panel.profile.themes.header")}
                    </span>
                    <span class="theme-warning" slot="description">
                      <ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.profile.themes.device.user_theme_info"
                      )}
                    </span>
                  </ha-settings-row>
                `
              : html`<ha-pick-theme-row
                  .narrow=${this.narrow}
                  .hass=${this.hass}
                  this._browserThemeActivated}
                  .storageLocation=${"user"}
                ></ha-pick-theme-row>`}
            ${this.hass.user!.is_admin
              ? html`
                  <ha-advanced-mode-row
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .coreUserData=${this._coreUserData}
                  ></ha-advanced-mode-row>
                `
              : ""}
          </ha-card>
          <ha-card
            .header=${this.hass.localize(
              isExternal
                ? "ui.panel.profile.mobile_app_settings"
                : "ui.panel.profile.browser_settings"
            )}
          >
            <div class="card-content">
              ${this.hass.localize("ui.panel.profile.client_settings_detail")}
            </div>
            <ha-settings-row .narrow=${this.narrow}>
              <span slot="heading">
                ${this.hass.localize(
                  isExternal
                    ? "ui.panel.profile.themes.device.mobile_app_header"
                    : "ui.panel.profile.themes.device.browser_header"
                )}
              </span>
              <span slot="description">
                ${this.hass.localize(
                  "ui.panel.profile.themes.device.description"
                )}
              </span>
              <ha-switch
                .checked=${!!this._browserThemeSettings ||
                this._browserThemeActivated}
                @change=${this._toggleBrowserTheme}
              ></ha-switch>
            </ha-settings-row>
            ${this._browserThemeSettings || this._browserThemeActivated
              ? html`
                  <ha-expansion-panel
                    outlined
                    .header=${this.hass.localize(
                      "ui.panel.profile.themes.device.custom_theme"
                    )}
                    expanded
                  >
                    <ha-pick-theme-row
                      class="device-theme"
                      .narrow=${this.narrow}
                      .hass=${this.hass}
                    ></ha-pick-theme-row>
                  </ha-expansion-panel>
                `
              : nothing}
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
              <ha-button @click=${this._customizeSidebar}>
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.button"
                )}
              </ha-button>
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
            <ha-set-suspend-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-set-suspend-row>
            <ha-enable-shortcuts-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-enable-shortcuts-row>
          </ha-card>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _customizeSidebar() {
    fireEvent(this, "hass-edit-sidebar", { editMode: true });
  }

  private _handleLogOut() {
    showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.profile.logout_title"),
      text: this.hass.localize("ui.panel.profile.logout_text"),
      confirmText: this.hass.localize("ui.panel.profile.logout"),
      confirm: () => fireEvent(this, "hass-logout"),
      destructive: true,
    });
  }

  private async _toggleBrowserTheme(ev: Event) {
    const switchElement = ev.target as HaSwitch;
    const enabled = switchElement.checked;

    if (!enabled) {
      if (!this._browserThemeSettings && this._browserThemeActivated) {
        // no changed have made, disable without confirmation
        this._browserThemeActivated = false;
      } else {
        const confirm = await showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.profile.themes.device.delete_header"
          ),
          text: this.hass.localize(
            "ui.panel.profile.themes.device.delete_description"
          ),
          confirmText: this.hass.localize("ui.common.delete"),
          destructive: true,
        });

        if (confirm) {
          this._browserThemeActivated = false;
          this._browserThemeSettings = undefined;
          fireEvent(this, "resetBrowserTheme");
        } else {
          // revert switch
          switchElement.click();
        }
      }
    } else {
      this._browserThemeActivated = true;
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

        ha-expansion-panel {
          margin: 0 8px 8px;
        }
        .theme-warning {
          color: var(--warning-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .device-theme {
          display: block;
          padding-bottom: 16px;
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-section-general": HaProfileSectionGeneral;
  }
}

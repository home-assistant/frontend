import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-button";
import "../../components/ha-expansion-panel";
import "../../layouts/hass-tabs-subpage";
import { profileSections } from "./ha-panel-profile";
import { isExternal } from "../../data/external";
import type { CoreFrontendUserData } from "../../data/frontend";
import { getOptimisticFrontendUserDataCollection } from "../../data/frontend";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
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
import { fetchSidebarPreferences } from "../../data/sidebar";

@customElement("ha-profile-section-general")
class HaProfileSectionGeneral extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _coreUserData?: CoreFrontendUserData | null;

  @property({ attribute: false }) public route!: Route;

  @storage({
    key: "sidebarPanelOrder",
    state: true,
    subscribe: true,
  })
  private _devicePanelOrder?: string[];

  @storage({
    key: "sidebarHiddenPanels",
    state: true,
    subscribe: true,
  })
  private _deviceHiddenPanels?: string[];

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
    const deviceSidebarSettingsEnabled =
      !!this._devicePanelOrder || !!this._deviceHiddenPanels;

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
            <ha-settings-row .narrow=${this.narrow}>
              <span slot="heading">
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.header"
                )}
              </span>
              <span
                slot="description"
                class=${deviceSidebarSettingsEnabled ? "device-info" : ""}
              >
                ${this.hass.localize(
                  `ui.panel.profile.customize_sidebar.${!deviceSidebarSettingsEnabled ? "description" : "overwritten_by_device"}`
                )}
              </span>
              <ha-button
                .disabled=${deviceSidebarSettingsEnabled}
                @click=${this._customizeSidebar}
              >
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.button"
                )}
              </ha-button>
            </ha-settings-row>
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
                  "ui.panel.profile.customize_sidebar.device_specific_header"
                )}
              </span>
              <span slot="description">
                ${this.hass.localize(
                  "ui.panel.profile.customize_sidebar.device_description"
                )}
              </span>
              <ha-switch
                .checked=${deviceSidebarSettingsEnabled}
                @change=${this._toggleDeviceSidebarPreferences}
              ></ha-switch>
            </ha-settings-row>
            ${deviceSidebarSettingsEnabled
              ? html`
                  <ha-expansion-panel
                    outlined
                    .header=${this.hass.localize(
                      "ui.panel.profile.customize_sidebar.device_specific_header"
                    )}
                    expanded
                  >
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
                  </ha-expansion-panel>
                `
              : nothing}
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

  private async _toggleDeviceSidebarPreferences(ev: Event) {
    const switchElement = ev.target as HaSwitch;
    const enabled = switchElement.checked;

    if (!enabled) {
      if (this._devicePanelOrder || this._deviceHiddenPanels) {
        const confirm = await showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.profile.customize_sidebar.delete_device_preferences_header"
          ),
          text: this.hass.localize(
            "ui.panel.profile.customize_sidebar.delete_device_preferences_description"
          ),
          confirmText: this.hass.localize("ui.common.delete"),
          destructive: true,
        });

        if (confirm) {
          this._devicePanelOrder = undefined;
          this._deviceHiddenPanels = undefined;
        } else {
          // revert switch
          switchElement.click();
        }
      }
    } else {
      const sidebarPreferences = await fetchSidebarPreferences(this.hass);
      this._devicePanelOrder = sidebarPreferences?.panelOrder ?? [];
      this._deviceHiddenPanels = sidebarPreferences?.hiddenPanels ?? [];
    }
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

        .device-info {
          color: var(--warning-color);
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

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-menu-button";
import { CloudStatus } from "../../../data/cloud";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./ha-config-navigation";
import { mdiCloudLock } from "@mdi/js";

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  @property() public showAdvanced!: boolean;

  protected render(): TemplateResult {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
          </app-toolbar>
        </app-header>

        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize("ui.panel.config.introduction")}
          </div>

          ${this.cloudStatus && isComponentLoaded(this.hass, "cloud")
            ? html`
                <ha-card>
                  <ha-config-navigation
                    .hass=${this.hass}
                    .showAdvanced=${this.showAdvanced}
                    .pages=${[
                      {
                        component: "cloud",
                        path: "/config/cloud",
                        translationKey: "ui.panel.config.cloud.caption",
                        info: this.cloudStatus,
                        iconPath: mdiCloudLock,
                      },
                    ]}
                  ></ha-config-navigation>
                </ha-card>
              `
            : ""}
          ${Object.values(configSections).map(
            (section) => html`
              <ha-card>
                <ha-config-navigation
                  .hass=${this.hass}
                  .showAdvanced=${this.showAdvanced}
                  .pages=${section}
                ></ha-config-navigation>
              </ha-card>
            `
          )}
          ${isComponentLoaded(this.hass, "zha")
            ? html`
                <div class="promo-advanced">
                  ${this.hass.localize(
                    "ui.panel.config.integration_panel_move.missing_zha",
                    "integrations_page",
                    html`<a href="/config/integrations">
                      ${this.hass.localize(
                        "ui.panel.config.integration_panel_move.link_integration_page"
                      )}
                    </a>`
                  )}
                </div>
              `
            : ""}
          ${isComponentLoaded(this.hass, "zwave")
            ? html`
                <div class="promo-advanced">
                  ${this.hass.localize(
                    "ui.panel.config.integration_panel_move.missing_zwave",
                    "integrations_page",
                    html`<a href="/config/integrations">
                      ${this.hass.localize(
                        "ui.panel.config.integration_panel_move.link_integration_page"
                      )}
                    </a>`
                  )}
                </div>
              `
            : ""}
          ${!this.showAdvanced
            ? html`
                <div class="promo-advanced">
                  ${this.hass.localize(
                    "ui.panel.config.advanced_mode.hint_enable"
                  )}
                  <a href="/profile"
                    >${this.hass.localize(
                      "ui.panel.config.advanced_mode.link_profile_page"
                    )}</a
                  >.
                </div>
              `
            : ""}
        </ha-config-section>
      </app-header-layout>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        app-header {
          --app-header-background-color: var(--primary-background-color);
        }
        ha-card:last-child {
          margin-bottom: 24px;
        }
        ha-config-section {
          margin-top: -20px;
        }
        ha-card {
          overflow: hidden;
        }
        ha-card a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
        .promo-advanced {
          text-align: center;
          color: var(--secondary-text-color);
          margin-bottom: 24px;
        }
        .promo-advanced a {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-dashboard": HaConfigDashboard;
  }
}

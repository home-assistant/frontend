import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
} from "lit-element";
import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";

import "../../../components/ha-menu-button";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

import "../../../components/ha-card";

import "../ha-config-section";
import "./ha-config-navigation";

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public cloudStatus?: CloudStatus;
  @property() public showAdvanced!: boolean;

  protected render(): TemplateResult | void {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.config")}</div>
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
                  <a href="/config/cloud" tabindex="-1">
                    <paper-item>
                      <paper-item-body two-line="">
                        ${this.hass.localize("ui.panel.config.cloud.caption")}
                        ${this.cloudStatus.logged_in
                          ? html`
                              <div secondary="">
                                ${this.hass.localize(
                                  "ui.panel.config.cloud.description_login",
                                  "email",
                                  (this.cloudStatus as CloudStatusLoggedIn)
                                    .email
                                )}
                              </div>
                            `
                          : html`
                              <div secondary="">
                                ${this.hass.localize(
                                  "ui.panel.config.cloud.description_features"
                                )}
                              </div>
                            `}
                      </paper-item-body>
                      <ha-icon-next></ha-icon-next>
                    </paper-item>
                  </a>
                </ha-card>
              `
            : ""}

          <ha-card>
            <ha-config-navigation
              .hass=${this.hass}
              .showAdvanced=${this.showAdvanced}
              .pages=${[
                { page: "integrations", core: true },
                { page: "devices", core: true },
                { page: "entities", core: true },
                { page: "automation" },
                { page: "script" },
                { page: "scene" },
              ]}
            ></ha-config-navigation>
          </ha-card>
          <ha-card>
            <ha-config-navigation
              .hass=${this.hass}
              .showAdvanced=${this.showAdvanced}
              .pages=${[
                { page: "core", core: true },
                { page: "server_control", core: true },
                { page: "areas", core: true },
                { page: "zone" },
                { page: "person" },
                { page: "users", core: true },
                { page: "zha" },
                { page: "zwave" },
                { page: "customize", core: true, advanced: true },
              ]}
            ></ha-config-navigation>
          </ha-card>

          ${!this.showAdvanced
            ? html`
                <div class="promo-advanced">
                  ${this.hass.localize(
                    "ui.panel.profile.advanced_mode.hint_enable"
                  )}
                  <a href="/profile"
                    >${this.hass.localize(
                      "ui.panel.profile.advanced_mode.link_profile_page"
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
        ha-config-navigation:last-child {
          margin-bottom: 24px;
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

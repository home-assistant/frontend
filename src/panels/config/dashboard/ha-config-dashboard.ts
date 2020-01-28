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
import { CloudStatus } from "../../../data/cloud";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

import "../../../components/ha-card";
import "../../../components/ha-icon-next";

import "../ha-config-section";
import "./ha-config-navigation";
import { configSections } from "../ha-panel-config";

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
                  <ha-config-navigation
                    .hass=${this.hass}
                    .showAdvanced=${this.showAdvanced}
                    .pages=${[
                      {
                        page: "cloud",
                        info: this.cloudStatus,
                        icon: "hass:cloud-lock",
                      },
                    ]}
                  ></ha-config-navigation>
                </ha-card>
              `
            : ""}
          ${configSections.map(
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
          <ha-card>
            <ha-config-navigation
              .hass=${this.hass}
              .showAdvanced=${this.showAdvanced}
              .pages=${[{ page: "zha" }, { page: "zwave" }]}
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
        app-header {
          border-bottom: 1px solid var(--divider-color);
        }

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

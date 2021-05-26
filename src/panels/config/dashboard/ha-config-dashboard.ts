import { mdiCloudLock } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-menu-button";
import "../../../components/ha-svg-icon";
import { CloudStatus } from "../../../data/cloud";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./ha-config-navigation";

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  @property() public showAdvanced!: boolean;

  protected render(): TemplateResult {
    const content = html` <ha-config-section
      .narrow=${this.narrow}
      .isWide=${this.isWide}
    >
      <div slot="header">${this.hass.localize("ui.panel.config.header")}</div>

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
                    name: "Home Assistant Cloud",
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
      ${!this.showAdvanced
        ? html`
            <div class="promo-advanced">
              ${this.hass.localize("ui.panel.config.advanced_mode.hint_enable")}
              <a href="/profile"
                >${this.hass.localize(
                  "ui.panel.config.advanced_mode.link_profile_page"
                )}</a
              >.
            </div>
          `
        : ""}
    </ha-config-section>`;

    if (!this.narrow && this.hass.dockedSidebar !== "always_hidden") {
      return content;
    }

    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
          </app-toolbar>
        </app-header>

        ${content}
      </ha-app-layout>
    `;
  }

  static get styles(): CSSResultGroup {
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
          margin-top: -12px;
        }
        :host([narrow]) ha-config-section {
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

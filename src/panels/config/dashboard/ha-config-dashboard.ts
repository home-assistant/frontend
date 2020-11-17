import "../../../layouts/ha-app-layout";
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
import "../../../components/ha-svg-icon";
import "../../../components/ha-menu-button";
import { CloudStatus } from "../../../data/cloud";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./ha-config-navigation";
import { mdiClose, mdiCloudLock } from "@mdi/js";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";

const CONF_HAPPENING = new Date() < new Date("2020-12-13T23:00:00Z");

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
                    name: "Home Assistant Cloud",
                    info: this.cloudStatus,
                    iconPath: mdiCloudLock,
                  },
                ]}
              ></ha-config-navigation>
            </ha-card>
          `
        : ""}
      ${CONF_HAPPENING && !localStorage.dismissConf2020
        ? html`
            <ha-card class="conf-card">
              <a
                target="_blank"
                href="https://www.home-assistant.io/conference"
                rel="noopener noreferrer"
              >
                <img src="/static/images/conference.png" />
                <div class="carrot"><ha-icon-next></ha-icon-next></div>
              </a>
              <ha-svg-icon
                .path=${mdiClose}
                @click=${this._dismissConference}
              ></ha-svg-icon>
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

  private async _dismissConference() {
    if (
      await showConfirmationDialog(this, {
        title: "Home Assistant Conference",
        text: html`
          If you've
          <a
            target="_blank"
            href="https://hopin.to/events/home-assistant-conference"
            rel="noopener noreferrer"
            >bought your ticket</a
          >
          or have
          <a
            target="_blank"
            href="https://www.youtube.com/watch?v=xSB_MuKkgxE"
            rel="noopener noreferrer"
            >subscribed to the livestream</a
          >, you might want to dismiss this banner. Do you want to continue?
        `,
      })
    ) {
      localStorage.dismissConf2020 = "1";
      this.requestUpdate();
    }
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
        .conf-card {
          position: relative;
        }
        .conf-card img {
          display: block;
          width: 100%;
        }
        .conf-card .carrot {
          position: absolute;
          top: 0;
          right: 16px;
          bottom: 0;
          display: flex;
          align-items: center;
          color: white;
        }
        .conf-card ha-svg-icon {
          position: absolute;
          bottom: -4px;
          left: -4px;
          color: #a2cdf3;
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

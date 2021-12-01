import { mdiCellphoneCog, mdiCloudLock } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-menu-button";
import { CloudStatus } from "../../../data/cloud";
import { SupervisorAvailableUpdates } from "../../../data/supervisor/supervisor";
import {
  ExternalConfig,
  getExternalConfig,
} from "../../../external_app/external_config";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./ha-config-navigation";
import "./ha-config-updates";

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  @property() public supervisorUpdates?: SupervisorAvailableUpdates[] | null;

  @property() public showAdvanced!: boolean;

  @state() private _externalConfig?: ExternalConfig;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.hass && this.hass.auth.external) {
      getExternalConfig(this.hass.auth.external).then((conf) => {
        this._externalConfig = conf;
      });
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.config")}</div>
          </app-toolbar>
        </app-header>

        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          ${isComponentLoaded(this.hass, "hassio") &&
          this.supervisorUpdates === undefined
            ? html``
            : html`${this.supervisorUpdates?.length
                  ? html`<ha-card>
                      <ha-config-updates
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .supervisorUpdates=${this.supervisorUpdates}
                      ></ha-config-updates>
                    </ha-card>`
                  : ""}
                <ha-card>
                  ${this.narrow && this.supervisorUpdates?.length
                    ? html`<div class="title">
                        ${this.hass.localize("panel.config")}
                      </div>`
                    : ""}
                  ${this.cloudStatus && isComponentLoaded(this.hass, "cloud")
                    ? html`
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
                              iconColor: "#3B808E",
                            },
                          ]}
                        ></ha-config-navigation>
                      `
                    : ""}
                  ${this._externalConfig?.hasSettingsScreen
                    ? html`
                        <ha-config-navigation
                          .hass=${this.hass}
                          .showAdvanced=${this.showAdvanced}
                          .pages=${[
                            {
                              path: "#external-app-configuration",
                              name: "Companion App",
                              description: "Location and notifications",
                              iconPath: mdiCellphoneCog,
                              iconColor: "#37474F",
                              core: true,
                            },
                          ]}
                          @click=${this._handleExternalAppConfiguration}
                        ></ha-config-navigation>
                      `
                    : ""}
                  <ha-config-navigation
                    .hass=${this.hass}
                    .showAdvanced=${this.showAdvanced}
                    .pages=${configSections.dashboard}
                  ></ha-config-navigation>
                </ha-card>`}
        </ha-config-section>
      </ha-app-layout>
    `;
  }

  private _handleExternalAppConfiguration(ev: Event) {
    ev.preventDefault();
    this.hass.auth.external!.fireMessage({
      type: "config_screen/show",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        app-header {
          border-bottom: var(--app-header-border-bottom);
          --header-height: 55px;
        }
        ha-card:last-child {
          margin-bottom: 24px;
        }
        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }
        ha-card {
          overflow: hidden;
        }
        ha-card a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }
        :host([narrow]) ha-card {
          background-color: var(--primary-background-color);
          box-shadow: unset;
        }

        :host([narrow]) ha-config-section {
          margin-top: -42px;
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

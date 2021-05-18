import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCircle, mdiCloseCircle, mdiZWave } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import {
  fetchOZWInstances,
  networkOfflineStatuses,
  networkOnlineStatuses,
  networkStartingStatuses,
  OZWInstance,
} from "../../../../../data/ozw";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-loading-screen";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";

export const ozwTabs: PageNavigation[] = [];

@customElement("ozw-config-dashboard")
class OZWConfigDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @state() private _instances?: OZWInstance[];

  protected firstUpdated() {
    this._fetchData();
  }

  protected render(): TemplateResult {
    if (!this._instances) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (this._instances.length === 0) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .error=${this.hass.localize(
          "ui.panel.config.ozw.select_instance.none_found"
        )}
      ></hass-error-screen>`;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${ozwTabs}
        back-path="/config/integrations"
      >
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.ozw.select_instance.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.ozw.select_instance.introduction"
            )}
          </div>
          ${this._instances.length > 0
            ? html`
                ${this._instances.map((instance) => {
                  let status = "unknown";
                  let icon = mdiCircle;
                  if (networkOnlineStatuses.includes(instance.Status)) {
                    status = "online";
                    icon = mdiCheckCircle;
                  }
                  if (networkStartingStatuses.includes(instance.Status)) {
                    status = "starting";
                  }
                  if (networkOfflineStatuses.includes(instance.Status)) {
                    status = "offline";
                    icon = mdiCloseCircle;
                  }

                  return html`
                    <ha-card>
                      <a
                        href="/config/ozw/network/${instance.ozw_instance}"
                        aria-role="option"
                        tabindex="-1"
                      >
                        <paper-icon-item>
                          <ha-svg-icon .path=${mdiZWave} slot="item-icon">
                          </ha-svg-icon>
                          <paper-item-body>
                            ${this.hass.localize(
                              "ui.panel.config.ozw.common.instance"
                            )}
                            ${instance.ozw_instance}
                            <div secondary>
                              <ha-svg-icon
                                .path=${icon}
                                class="network-status-icon ${status}"
                              ></ha-svg-icon>
                              ${this.hass.localize(
                                "ui.panel.config.ozw.network_status." + status
                              )}
                              -
                              ${this.hass.localize(
                                "ui.panel.config.ozw.network_status.details." +
                                  instance.Status.toLowerCase()
                              )}<br />
                              ${this.hass.localize(
                                "ui.panel.config.ozw.common.controller"
                              )}
                              : ${instance.getControllerPath}<br />
                              OZWDaemon ${instance.OZWDaemon_Version} (OpenZWave
                              ${instance.OpenZWave_Version})
                            </div>
                          </paper-item-body>
                          <ha-icon-next></ha-icon-next>
                        </paper-icon-item>
                      </a>
                    </ha-card>
                  `;
                })}
              `
            : ""}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchData() {
    this._instances = await fetchOZWInstances(this.hass!);
    if (this._instances.length === 1) {
      navigate(`/config/ozw/network/${this._instances[0].ozw_instance}`, {
        replace: true,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
        paper-item-body {
          margin: 16px 0;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
          position: relative;
          display: block;
          outline: 0;
        }
        ha-svg-icon.network-status-icon {
          height: 14px;
          width: 14px;
        }
        .online {
          color: green;
        }
        .starting {
          color: orange;
        }
        .offline {
          color: red;
        }
        ha-svg-icon,
        ha-icon-next {
          color: var(--secondary-text-color);
        }
        .iron-selected paper-item::before,
        a:not(.iron-selected):focus::before {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: none;
          content: "";
          transition: opacity 15ms linear;
          will-change: opacity;
        }
        a:not(.iron-selected):focus::before {
          background-color: currentColor;
          opacity: var(--dark-divider-opacity);
        }
        .iron-selected paper-item:focus::before,
        .iron-selected:focus paper-item::before {
          opacity: 0.2;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-config-dashboard": OZWConfigDashboard;
  }
}

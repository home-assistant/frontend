import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCircle, mdiCloseCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import {
  fetchOZWNetworkStatistics,
  fetchOZWNetworkStatus,
  networkOfflineStatuses,
  networkOnlineStatuses,
  networkStartingStatuses,
  OZWInstance,
  OZWNetworkStatistics,
} from "../../../../../data/ozw";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { ozwNetworkTabs } from "./ozw-network-router";

@customElement("ozw-network-dashboard")
class OZWNetworkDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozwInstance?: number;

  @state() private _network?: OZWInstance;

  @state() private _statistics?: OZWNetworkStatistics;

  @state() private _status = "unknown";

  @state() private _icon = mdiCircle;

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate("/config/ozw/dashboard", { replace: true });
    } else if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${ozwNetworkTabs(this.ozwInstance!)}
      >
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.ozw.network.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize("ui.panel.config.ozw.network.introduction")}
          </div>
          ${this._network
            ? html`
                <ha-card class="content network-status">
                  <div class="card-content">
                    <div class="details">
                      <ha-svg-icon
                        .path=${this._icon}
                        class="network-status-icon ${classMap({
                          [this._status]: true,
                        })}"
                        slot="item-icon"
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.ozw.common.network"
                      )}
                      ${this.hass.localize(
                        `ui.panel.config.ozw.network_status.${this._status}`
                      )}
                      <br />
                      <small>
                        ${this.hass.localize(
                          `ui.panel.config.ozw.network_status.details.${this._network.Status.toLowerCase()}`
                        )}
                      </small>
                    </div>
                    <div class="secondary">
                      ${this.hass.localize(
                        "ui.panel.config.ozw.common.ozw_instance"
                      )}
                      ${this._network.ozw_instance}
                      ${this._statistics
                        ? html`
                            &bull;
                            ${this.hass.localize(
                              "ui.panel.config.ozw.network.node_count",
                              "count",
                              this._statistics.node_count
                            )}
                          `
                        : ``}
                      <br />
                      ${this.hass.localize(
                        "ui.panel.config.ozw.common.controller"
                      )}:
                      ${this._network.getControllerPath}<br />
                      OZWDaemon ${this._network.OZWDaemon_Version} (OpenZWave
                      ${this._network.OpenZWave_Version})
                    </div>
                  </div>
                  <div class="card-actions">
                    ${this._generateServiceButton("add_node")}
                    ${this._generateServiceButton("remove_node")}
                    ${this._generateServiceButton("cancel_command")}
                  </div>
                </ha-card>
              `
            : ``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchData() {
    if (!this.ozwInstance) return;
    this._network = await fetchOZWNetworkStatus(this.hass!, this.ozwInstance);
    this._statistics = await fetchOZWNetworkStatistics(
      this.hass!,
      this.ozwInstance
    );
    if (networkOnlineStatuses.includes(this._network!.Status)) {
      this._status = "online";
      this._icon = mdiCheckCircle;
    }
    if (networkStartingStatuses.includes(this._network!.Status)) {
      this._status = "starting";
    }
    if (networkOfflineStatuses.includes(this._network!.Status)) {
      this._status = "offline";
      this._icon = mdiCloseCircle;
    }
  }

  private _generateServiceButton(service: string) {
    const serviceData = { instance_id: this.ozwInstance };
    return html`
      <ha-call-service-button
        .hass=${this.hass}
        domain="ozw"
        .service=${service}
        .serviceData=${serviceData}
      >
        ${this.hass!.localize(`ui.panel.config.ozw.services.${service}`)}
      </ha-call-service-button>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .secondary {
          color: var(--secondary-text-color);
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
        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        .network-status {
          text-align: center;
        }

        .network-status div.details {
          font-size: 1.5rem;
          margin-bottom: 16px;
        }

        .network-status ha-svg-icon {
          display: block;
          margin: 0px auto 16px;
          width: 48px;
          height: 48px;
        }

        .network-status small {
          font-size: 1rem;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
          padding: 0 8px 12px;
        }

        [hidden] {
          display: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-network-dashboard": OZWNetworkDashboard;
  }
}

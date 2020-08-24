import "@material/mwc-fab";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/buttons/ha-call-service-button";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { mdiCircle, mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import "@material/mwc-button/mwc-button";
import {
  OZWInstance,
  fetchOZWNetworkStatus,
  fetchOZWNetworkStatistics,
  networkOnlineStatuses,
  networkOfflineStatuses,
  networkStartingStatuses,
  OZWNetworkStatistics,
} from "../../../../../data/ozw";

export const ozwTabs: PageNavigation[] = [];

@customElement("ozw-config-network")
class OZWConfigNetwork extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozw_instance = 0;

  @internalProperty() private _network?: OZWInstance;

  @internalProperty() private _statistics?: OZWNetworkStatistics;

  @internalProperty() private _status = "unknown";

  @internalProperty() private _icon = mdiCircle;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.ozw_instance <= 0) {
      navigate(this, "/config/ozw/dashboard", true);
    }
    if (this.hass) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    this._network = await fetchOZWNetworkStatus(this.hass!, this.ozw_instance);
    this._statistics = await fetchOZWNetworkStatistics(
      this.hass!,
      this.ozw_instance
    );
    if (networkOnlineStatuses.includes(this._network.Status)) {
      this._status = "online";
      this._icon = mdiCheckCircle;
    }
    if (networkStartingStatuses.includes(this._network.Status)) {
      this._status = "starting";
    }
    if (networkOfflineStatuses.includes(this._network.Status)) {
      this._status = "offline";
      this._icon = mdiCloseCircle;
    }
  }

  private _generateServiceButton(service: string) {
    return html`
      <ha-call-service-button
        .hass=${this.hass}
        domain="ozw"
        service="${service}"
      >
        ${this.hass!.localize("ui.panel.config.ozw.services." + service)}
      </ha-call-service-button>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${ozwTabs}
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
                        class="network-status-icon ${this._status}"
                        slot="item-icon"
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.ozw.common.network"
                      )}
                      ${this.hass.localize(
                        "ui.panel.config.ozw.network_status." + this._status
                      )}
                      <br />
                      <small>
                        ${this.hass.localize(
                          "ui.panel.config.ozw.network_status.details." +
                            this._network.Status.toLowerCase()
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
                  </div>
                </ha-card>
              `
            : ``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResultArray {
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
    "ozw-config-network": OZWConfigNetwork;
  }
}

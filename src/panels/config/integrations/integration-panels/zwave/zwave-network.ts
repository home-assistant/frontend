import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../components/buttons/ha-call-api-button";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-service-description";
import {
  fetchNetworkStatus,
  ZWaveNetworkStatus,
  ZWAVE_NETWORK_STATE_AWAKED,
  ZWAVE_NETWORK_STATE_READY,
  ZWAVE_NETWORK_STATE_STARTED,
  ZWAVE_NETWORK_STATE_STOPPED,
} from "../../../../../data/zwave";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { documentationUrl } from "../../../../../util/documentation-url";
import "../../../ha-config-section";

@customElement("zwave-network")
export class ZwaveNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @internalProperty() private _showHelp = false;

  @internalProperty() private _networkStatus?: ZWaveNetworkStatus;

  @internalProperty() private _unsubs: Array<Promise<UnsubscribeFunc>> = [];

  public disconnectedCallback(): void {
    this._unsubscribe();
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._getNetworkStatus();
    this._subscribe();
  }

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span>
            ${this.hass!.localize(
              "ui.panel.config.zwave.network_management.header"
            )}
          </span>
          <ha-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></ha-icon-button>
        </div>
        <div slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zwave.network_management.introduction"
          )}
          <p>
            <a
              href="${documentationUrl(
                this.hass,
                "/docs/z-wave/control-panel/"
              )}"
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass!.localize("ui.panel.config.zwave.learn_more")}
            </a>
          </p>
        </div>

        ${this._networkStatus
          ? html`
              <ha-card class="content network-status">
                <div class="details">
                  ${this._networkStatus.state === ZWAVE_NETWORK_STATE_STOPPED
                    ? html`
                        <ha-icon icon="hass:close"></ha-icon>
                        ${this.hass!.localize(
                          "ui.panel.config.zwave.network_status.network_stopped"
                        )}
                      `
                    : this._networkStatus.state === ZWAVE_NETWORK_STATE_STARTED
                    ? html`
                        <ha-circular-progress active></ha-circular-progress>
                        ${this.hass!.localize(
                          "ui.panel.config.zwave.network_status.network_starting"
                        )}<br />
                        <small>
                          ${this.hass!.localize(
                            "ui.panel.config.zwave.network_status.network_starting_note"
                          )}
                        </small>
                      `
                    : this._networkStatus.state === ZWAVE_NETWORK_STATE_AWAKED
                    ? html`
                        <ha-icon icon="hass:checkbox-marked-circle"> </ha-icon>
                        ${this.hass!.localize(
                          "ui.panel.config.zwave.network_status.network_started"
                        )}<br />
                        <small>
                          ${this.hass!.localize(
                            "ui.panel.config.zwave.network_status.network_started_note_some_queried"
                          )}
                        </small>
                      `
                    : this._networkStatus.state === ZWAVE_NETWORK_STATE_READY
                    ? html`
                        ${this.hass!.localize(
                          "ui.panel.config.zwave.network_status.network_started"
                        )}<br />
                        <small>
                          ${this.hass!.localize(
                            "ui.panel.config.zwave.network_status.network_started_note_all_queried"
                          )}
                        </small>
                      `
                    : ""}
                </div>
                <div class="card-actions">
                  ${this._networkStatus.state >= ZWAVE_NETWORK_STATE_AWAKED
                    ? html`
                        ${this._generateServiceButton("stop_network")}
                        ${this._generateServiceButton("heal_network")}
                        ${this._generateServiceButton("test_network")}
                      `
                    : html` ${this._generateServiceButton("start_network")} `}
                </div>
                ${this._networkStatus.state >= ZWAVE_NETWORK_STATE_AWAKED
                  ? html`
                      <div class="card-actions">
                        ${this._generateServiceButton("soft_reset")}
                        <ha-call-api-button
                          .hass=${this.hass}
                          path="zwave/saveconfig"
                        >
                          ${this.hass!.localize(
                            "ui.panel.config.zwave.services.save_config"
                          )}
                        </ha-call-api-button>
                      </div>
                    `
                  : ""}
              </ha-card>
              ${this._networkStatus.state >= ZWAVE_NETWORK_STATE_AWAKED
                ? html`
                    <ha-card class="content">
                      <div class="card-actions">
                        ${this._generateServiceButton("add_node_secure")}
                        ${this._generateServiceButton("add_node")}
                        ${this._generateServiceButton("remove_node")}
                      </div>
                      <div class="card-actions">
                        ${this._generateServiceButton("cancel_command")}
                      </div>
                    </ha-card>
                  `
                : ""}
            `
          : ""}
      </ha-config-section>
    `;
  }

  private async _getNetworkStatus(): Promise<void> {
    this._networkStatus = await fetchNetworkStatus(this.hass!);
  }

  private _subscribe(): void {
    this._unsubs = [
      "zwave.network_start",
      "zwave.network_stop",
      "zwave.network_ready",
      "zwave.network_complete",
      "zwave.network_complete_some_dead",
    ].map((e) =>
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        e
      )
    );
  }

  private _unsubscribe(): void {
    while (this._unsubs.length) {
      this._unsubs.pop()!.then((unsub) => unsub());
    }
  }

  private _handleEvent(event) {
    if (event.event_type === "zwave.network_start") {
      // Optimistically set the state, wait 1s and poll the backend
      // The backend will still report a state of 0 when the 'network_start'
      // event is first fired.
      if (this._networkStatus) {
        this._networkStatus = { ...this._networkStatus, state: 5 };
      }
      setTimeout(() => this._getNetworkStatus, 1000);
    } else {
      this._getNetworkStatus();
    }
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _generateServiceButton(service: string) {
    return html`
      <ha-call-service-button
        .hass=${this.hass}
        domain="zwave"
        service="${service}"
      >
        ${this.hass!.localize("ui.panel.config.zwave.services." + service)}
      </ha-call-service-button>
      <ha-service-description
        .hass=${this.hass}
        domain="zwave"
        service="${service}"
        ?hidden=${!this._showHelp}
      >
      </ha-service-description>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
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
          padding: 24px;
        }

        .network-status ha-icon {
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
    "zwave-network": ZwaveNetwork;
  }
}

import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import {
  fetchNetworkStatus,
  ZWaveNetworkStatus,
  ZWAVE_NETWORK_STATE_STOPPED,
  ZWAVE_NETWORK_STATE_STARTED,
  ZWAVE_NETWORK_STATE_AWAKED,
  ZWAVE_NETWORK_STATE_READY,
} from "../../../data/zwave";

import "../../../components/buttons/ha-call-api-button";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../ha-config-section";

@customElement("zwave-network")
export class ZwaveNetwork extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() private _showHelp = false;
  @property() private _networkStatus?: ZWaveNetworkStatus;
  @property() private _unsubs: Array<Promise<UnsubscribeFunc>> = [];

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
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <div slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zwave.network_management.introduction"
          )}
          <p>
            <a
              href="https://www.home-assistant.io/docs/z-wave/control-panel/"
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
                        <paper-spinner active></paper-spinner>
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
                    : html`
                        ${this._generateServiceButton("start_network")}
                      `}
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
          color: var(--google-red-500);
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

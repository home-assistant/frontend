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

import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { fetchNetworkStatus, ZWaveNetworkStatus } from "../../../data/zwave";

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
  @property() private _networkStarting = false;
  @property() private _unsubs: UnsubscribeFunc[] = [];

  public firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._getNetworkStatus();
    this._subscribe();
  }
  public disconnectedCallback(): void {
    this._unsubscribe();
  }
  private async _getNetworkStatus(): Promise<void> {
    this._networkStatus = await fetchNetworkStatus(this.hass!);
  }
  private _subscribe(): void {
    this._unsubs.push(
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        "zwave.network_start"
      )
    );
    this._unsubs.push(
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        "zwave.network_stop"
      )
    );
    this._unsubs.push(
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        "zwave.network_ready"
      )
    );
    this._unsubs.push(
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        "zwave.network_complete"
      )
    );
    this._unsubs.push(
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        "zwave.network_complete_some_dead"
      )
    );
  }

  private _unsubscribe(): void {
    while (this._unsubs.length) {
      this._unsubs.pop()();
    }
  }

  private _handleEvent(event) {
    this._getNetworkStatus();
    if (event["event_type"] == "zwave.network_start") {
      this._networkStarting = true;
    } else {
      this._networkStarting = false;
    }
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div style="position: relative" slot="header">
          <span>Z-Wave Network Management</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <span slot="introduction">
          Run commands that affect the Z-Wave network. You won't get feedback on
          whether the command succeeded, but you can look in the OZW Log to try
          to figure out.
        </span>

        ${this._networkStatus
          ? html`
              <ha-card class="content network-status">
                <div class="details">
                  ${this._networkStarting
                    ? html`
                        <paper-spinner
                          active
                          alt="Starting Network..."
                        ></paper-spinner>
                        Starting Z-Wave Network...<br />
                        <small
                          >This may take a while depending on the size of your
                          network</small
                        >
                      `
                    : html`
                        ${this._networkStatus.state == 0
                          ? html`
                              <ha-icon icon="hass:close"> </ha-icon>
                              Z-Wave Network Stopped
                            `
                          : ""}
                        ${this._networkStatus.state == 5
                          ? html`
                              <paper-spinner
                                alt="Starting Network..."
                              ></paper-spinner>
                              Z-Wave Network Starting
                            `
                          : ""}
                        ${this._networkStatus.state == 7
                          ? html`
                              <ha-icon icon="hass:checkbox-marked-circle">
                              </ha-icon>
                              Z-Wave Network Started<br />
                              <small
                                >Awake nodes have been queried. Sleeping nodes
                                will be queried when they wake.</small
                              >
                            `
                          : ""}
                        ${this._networkStatus.state == 10
                          ? html`
                              Z-Wave Network Started<br />
                              <small>All nodes have been queried.</small>
                            `
                          : ""}
                      `}
                </div>
                <div class="card-actions">
                  ${this._networkStatus.state >= 7
                    ? html`
                        ${this._generateServiceButton(
                          "stop_network",
                          "Stop Network"
                        )}
                        ${this._generateServiceButton(
                          "heal_network",
                          "Heal Network"
                        )}
                        ${this._generateServiceButton(
                          "test_network",
                          "Test Network"
                        )}
                      `
                    : html`
                        ${this._generateServiceButton(
                          "start_network",
                          "Start Network"
                        )}
                      `}
                </div>
                ${this._networkStatus.state >= 7
                  ? html`
                      <div class="card-actions">
                        ${this._generateServiceButton(
                          "soft_reset",
                          "Soft Reset"
                        )}
                        <ha-call-api-button
                          .hass=${this.hass}
                          path="zwave/saveconfig"
                        >
                          Save Config
                        </ha-call-api-button>
                      </div>
                    `
                  : ""}
              </ha-card>
              ${this._networkStatus.state >= 7
                ? html`
                    <ha-card class="content">
                      <div class="card-actions">
                        ${this._generateServiceButton(
                          "add_node_secure",
                          "Add Node Secure"
                        )}
                        ${this._generateServiceButton("add_node", "Add Node")}
                        ${this._generateServiceButton(
                          "remove_node",
                          "Remove Node"
                        )}
                      </div>
                      <div class="card-actions">
                        ${this._generateServiceButton(
                          "cancel_command",
                          "Cancel Command"
                        )}
                      </div>
                    </ha-card>
                  `
                : ""}
            `
          : ""}
      </ha-config-section>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _generateServiceButton(service: string, title: string) {
    return html`
      <ha-call-service-button
        .hass=${this.hass}
        domain="zwave"
        service="${service}"
      >
        ${title}
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

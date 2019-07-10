import "@polymer/paper-icon-button/paper-icon-button";

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

import "../../../components/buttons/ha-call-api-button";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/ha-card";
import "../ha-config-section";

@customElement("zwave-network")
export class ZwaveNetwork extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() private _showHelp = false;

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

        <ha-card class="content">
          <div class="card-actions">
            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="add_node_secure"
            >
              Add Node Secure
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="add_node_secure"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>

            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="add_node"
            >
              Add Node
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="add_node"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>

            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="remove_node"
            >
              Remove Node
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="remove_node"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>
          </div>
          <div class="card-actions warning">
            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="cancel_command"
            >
              Cancel Command
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="cancel_command"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>
          </div>
          <div class="card-actions">
            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="heal_network"
            >
              Heal Network
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="heal_network"
              ?hidden=${!this._showHelp}
            ></ha-service-description>

            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="start_network"
            >
              Start Network
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="start_network"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>

            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="stop_network"
            >
              Stop Network
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="stop_network"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>

            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="soft_reset"
            >
              Soft Reset
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="soft_reset"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>

            <ha-call-service-button
              .hass=${this.hass}
              domain="zwave"
              service="test_network"
            >
              Test Network
            </ha-call-service-button>
            <ha-service-description
              .hass=${this.hass}
              domain="zwave"
              service="test_network"
              ?hidden=${!this._showHelp}
            >
            </ha-service-description>

            <ha-call-api-button .hass=${this.hass} path="zwave/saveconfig">
              Save Config
            </ha-call-api-button>
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .content {
          margin-top: 24px;
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

import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../ha-config-section";
import "./zha-clusters";
import "./zha-device-card";
import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { fireEvent } from "../../../common/dom/fire_event";
import { fetchDevices, ZHADevice } from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ItemSelectedEvent, ZHADeviceRemovedEvent } from "./types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-node-selected": {
      node?: ZHADevice;
    };
  }
}

@customElement("zha-node")
export class ZHANode extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _showHelp: boolean = false;
  @property() private _selectedDeviceIndex: number = -1;
  @property() private _selectedDevice?: ZHADevice;
  @property() private _nodes: ZHADevice[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    this._fetchDevices();
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span>Device Management</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <span slot="introduction">
          Run ZHA commands that affect a single device. Pick a device to see a
          list of available commands. <br /><br />Note: Sleepy (battery powered)
          devices need to be awake when executing commands against them. You can
          generally wake a sleepy device by triggering it. <br /><br />Some
          devices such as Xiaomi sensors have a wake up button that you can
          press at ~5 second intervals that keep devices awake while you
          interact with them.
        </span>
        <paper-card class="content">
          <div class="node-picker">
            <paper-dropdown-menu
              label="Devices"
              class="flex"
              id="zha-device-selector"
            >
              <paper-listbox
                slot="dropdown-content"
                @iron-select="${this._selectedDeviceChanged}"
                .selected="${this._selectedDeviceIndex}"
              >
                ${this._nodes.map(
                  (entry) => html`
                    <paper-item
                      >${entry.user_given_name
                        ? entry.user_given_name
                        : entry.name}</paper-item
                    >
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._showHelp
            ? html`
                <div class="help-text">
                  Select device to view per-device options
                </div>
              `
            : ""}
          ${this._selectedDeviceIndex !== -1
            ? html`
                <zha-device-card
                  class="card"
                  .hass="${this.hass}"
                  .device="${this._selectedDevice}"
                  .narrow="${!this.isWide}"
                  .showHelp="${this._showHelp}"
                  .showActions="${true}"
                  @zha-device-removed="${this._onDeviceRemoved}"
                  .isJoinPage="${false}"
                ></zha-device-card>
              `
            : ""}
          ${this._selectedDevice ? this._renderClusters() : ""}
        </paper-card>
      </ha-config-section>
    `;
  }

  private _renderClusters(): TemplateResult {
    return html`
      <zha-clusters
        .hass="${this.hass}"
        .selectedDevice="${this._selectedDevice}"
        .showHelp="${this._showHelp}"
      ></zha-clusters>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _selectedDeviceChanged(event: ItemSelectedEvent): void {
    this._selectedDeviceIndex = event!.target!.selected;
    this._selectedDevice = this._nodes[this._selectedDeviceIndex];
    fireEvent(this, "zha-node-selected", { node: this._selectedDevice });
  }

  private async _fetchDevices() {
    this._nodes = (await fetchDevices(this.hass!)).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }

  private _onDeviceRemoved(event: ZHADeviceRemovedEvent): void {
    this._selectedDeviceIndex = -1;
    this._nodes.splice(this._nodes.indexOf(event.detail!.device!), 1);
    this._selectedDevice = undefined;
    fireEvent(this, "zha-node-selected", { node: this._selectedDevice });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }

        .content {
          margin-top: 24px;
        }

        .node-info {
          margin-left: 16px;
        }

        .sectionHeader {
          position: relative;
        }

        .help-text {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 16px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .node-picker {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .card {
          box-sizing: border-box;
          display: flex;
          flex: 1 0 300px;
          min-width: 0;
          max-width: 600px;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
          word-wrap: break-word;
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }

        .toggle-help-icon {
          position: absolute;
          top: 6px;
          right: 0;
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-node": ZHANode;
  }
}

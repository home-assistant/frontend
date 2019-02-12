import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
  PropertyValues,
  css,
} from "lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import { haStyle } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { ItemSelectedEvent, NodeServiceData } from "./types";
import "./zha-clusters";
import "./zha-device-card";
import { reconfigureNode, fetchDevices, ZHADevice } from "../../../data/zha";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-node-selected": {
      node?: ZHADevice;
    };
  }
}

export class ZHANode extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _showHelp: boolean;
  private _selectedNodeIndex: number;
  private _selectedNode?: ZHADevice;
  private _serviceData?: {};
  private _nodes: ZHADevice[];

  constructor() {
    super();
    this._showHelp = false;
    this._selectedNodeIndex = -1;
    this._nodes = [];
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      _showHelp: {},
      _selectedNodeIndex: {},
      _selectedNode: {},
      _entities: {},
      _serviceData: {},
      _nodes: {},
    };
  }

  public firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this._nodes.length === 0) {
      this._fetchDevices();
    }
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  protected serviceCalled(ev): void {
    // Check if this is for us
    if (ev.detail.success && ev.detail.service === "remove") {
      this._selectedNodeIndex = -1;
      this._fetchDevices();
    }
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span>Node Management</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <span slot="introduction">
          Run ZHA commands that affect a single node. Pick a node to see a list
          of available commands. <br /><br />Note: Sleepy (battery powered)
          devices need to be awake when executing commands against them. You can
          generally wake a sleepy device by triggering it. <br /><br />Some
          devices such as Xiaomi sensors have a wake up button that you can
          press at ~5 second intervals that keep devices awake while you
          interact with them.
        </span>
        <paper-card class="content">
          <div class="node-picker">
            <paper-dropdown-menu label="Nodes" class="flex">
              <paper-listbox
                slot="dropdown-content"
                @iron-select="${this._selectedNodeChanged}"
                .selected="${this._selectedNodeIndex}"
              >
                ${this._nodes.map(
                  (entry) => html`
                    <paper-item>${entry.name}</paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._showHelp
            ? html`
                <div class="helpText">
                  Select node to view per-node options
                </div>
              `
            : ""}
          ${this._selectedNodeIndex !== -1
            ? html`
                <zha-device-card
                  class="card"
                  .hass="${this.hass}"
                  .device="${this._selectedNode}"
                  .narrow="${!this.isWide}"
                ></zha-device-card>
              `
            : ""}
          ${this._selectedNodeIndex !== -1 ? this._renderNodeActions() : ""}
          ${this._selectedNode ? this._renderClusters() : ""}
        </paper-card>
      </ha-config-section>
    `;
  }

  private _renderNodeActions(): TemplateResult {
    return html`
      <div class="card-actions">
        <paper-button @click="${this._onReconfigureNodeClick}"
          >Reconfigure Node</paper-button
        >
        ${this._showHelp
          ? html`
              <div class="helpText">
                ${this.hass!.localize(
                  "ui.panel.config.zha.services.reconfigure"
                )}
              </div>
            `
          : ""}
        <ha-call-service-button
          .hass="${this.hass}"
          domain="zha"
          service="remove"
          .serviceData="${this._serviceData}"
          >Remove Node</ha-call-service-button
        >
        ${this._showHelp
          ? html`
              <ha-service-description
                .hass="${this.hass}"
                domain="zha"
                service="remove"
              />
            `
          : ""}
      </div>
    `;
  }

  private _renderClusters(): TemplateResult {
    return html`
      <zha-clusters
        .hass="${this.hass}"
        .selectedDevice="${this._selectedNode}"
        .showHelp="${this._showHelp}"
      ></zha-clusters>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _selectedNodeChanged(event: ItemSelectedEvent): void {
    this._selectedNodeIndex = event!.target!.selected;
    this._selectedNode = this._nodes[this._selectedNodeIndex];
    fireEvent(this, "zha-node-selected", { node: this._selectedNode });
    this._serviceData = this._computeNodeServiceData();
  }

  private async _onReconfigureNodeClick(): Promise<void> {
    if (this.hass) {
      await reconfigureNode(this.hass, this._selectedNode!.ieee);
    }
  }

  private _computeNodeServiceData(): NodeServiceData {
    return {
      ieee_address: this._selectedNode!.ieee,
    };
  }

  private async _fetchDevices() {
    this._nodes = (await fetchDevices(this.hass!)).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
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
          padding-left: 28px;
          padding-right: 28px;
        }

        .helpText {
          color: grey;
          padding: 16px;
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

customElements.define("zha-node", ZHANode);

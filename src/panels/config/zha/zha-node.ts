import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { HassEntity } from "home-assistant-js-websocket";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import computeStateName from "../../../common/entity/compute_state_name";
import sortByName from "../../../common/entity/states_sort_by_name";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import { haStyle } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import {
  ItemSelectedEvent,
  NodeServiceData,
  ZHAEntitySelectedParams,
} from "./types";
import "./zha-clusters";
import "./zha-entities";
import { reconfigureNode } from "../../../data/zha";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-node-selected": {
      node?: HassEntity;
    };
  }
}

export class ZHANode extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _showHelp: boolean;
  private _selectedNodeIndex: number;
  private _selectedNode?: HassEntity;
  private _selectedEntity?: HassEntity;
  private _serviceData?: {};
  private _nodes: HassEntity[];

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
      _serviceData: {},
      _selectedEntity: {},
    };
  }

  protected render(): TemplateResult | void {
    this._nodes = this._computeNodes(this.hass);
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
              >
                ${this._nodes.map(
                  (entry) => html`
                    <paper-item
                      >${this._computeSelectCaption(entry)}</paper-item
                    >
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
          ${this._selectedNodeIndex !== -1 ? this._renderNodeActions() : ""}
          ${this._selectedNodeIndex !== -1 ? this._renderEntities() : ""}
          ${this._selectedEntity ? this._renderClusters() : ""}
        </paper-card>
      </ha-config-section>
    `;
  }

  private _renderNodeActions(): TemplateResult {
    return html`
      <div class="card-actions">
        <paper-button @click="${this._showNodeInformation}"
          >Node Information</paper-button
        >
        <paper-button @click="${this._onReconfigureNodeClick}"
          >Reconfigure Node</paper-button
        >
        ${this._showHelp
          ? html`
              <ha-service-description
                .hass="${this.hass}"
                domain="zha"
                service="reconfigure_device"
              />
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

  private _renderEntities(): TemplateResult {
    return html`
      <zha-entities
        .hass="${this.hass}"
        .selectedNode="${this._selectedNode}"
        .showHelp="${this._showHelp}"
        @zha-entity-selected="${this._onEntitySelected}"
      ></zha-entities>
    `;
  }

  private _renderClusters(): TemplateResult {
    return html`
      <zha-clusters
        .hass="${this.hass}"
        .selectedEntity="${this._selectedEntity}"
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
    this._selectedEntity = undefined;
    fireEvent(this, "zha-node-selected", { node: this._selectedNode });
    this._serviceData = this._computeNodeServiceData();
  }

  private async _onReconfigureNodeClick(): Promise<void> {
    if (this.hass) {
      await reconfigureNode(this.hass, this._selectedNode!.attributes.ieee);
    }
  }

  private _showNodeInformation(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._selectedNode!.entity_id,
    });
  }

  private _computeNodeServiceData(): NodeServiceData {
    return {
      ieee_address: this._selectedNode!.attributes.ieee,
    };
  }

  private _computeSelectCaption(stateObj: HassEntity): string {
    return (
      computeStateName(stateObj) + " (Node:" + stateObj.attributes.ieee + ")"
    );
  }

  private _computeNodes(hass?: HomeAssistant): HassEntity[] {
    if (hass) {
      return Object.keys(hass.states)
        .map((key) => hass.states[key])
        .filter((ent) => ent.entity_id.match("zha[.]"))
        .sort(sortByName);
    } else {
      return [];
    }
  }

  private _onEntitySelected(
    entitySelectedEvent: HASSDomEvent<ZHAEntitySelectedParams>
  ): void {
    this._selectedEntity = entitySelectedEvent.detail.entity;
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

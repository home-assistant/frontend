import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../resources/ha-style";
import "../ha-config-section";

import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
import computeStateName from "../../../common/entity/compute_state_name";
import sortByName from "../../../common/entity/states_sort_by_name";
import { fireEvent } from "../../../common/dom/fire_event";
import { ItemSelectedEvent } from "./types";

import "./zha-entities";
import "./zha-clusters";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-node-selected": {
      node?: HassEntity;
    };
  }
}

export class ZhaNode extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _showHelp: boolean;
  private _selectedNodeIndex: number;
  private _selectedNode?: HassEntity;
  private _selectedEntity?: HassEntity;
  private _serviceData?: {};
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;
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

  protected render(): TemplateResult {
    this._nodes = this._computeNodes(this.hass);
    return html`
      ${this.renderStyle()}
      <ha-config-section .isWide="${this.isWide}">
        <div style="position: relative" slot="header">
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
          ${this._renderNodePicker()}
          <div ?hidden="${!this._showHelp}" style="color: grey; padding: 16px">
            Select node to view per-node options
          </div>
          ${this._selectedNodeIndex !== -1 ? this._renderNodeActions() : ""}
          ${this._selectedNodeIndex !== -1 ? this._renderEntities() : ""}
          ${this._selectedEntity ? this._renderClusters() : ""}
        </paper-card>
      </ha-config-section>
    `;
  }

  private _renderNodePicker(): TemplateResult {
    return html`
      <div class="node-picker">
        <paper-dropdown-menu dynamic-align="" label="Nodes" class="flex">
          <paper-listbox
            slot="dropdown-content"
            @iron-select="${this._selectedNodeChanged}"
          >
            ${
              this._nodes.map(
                (entry) => html`
                  <paper-item>${this._computeSelectCaption(entry)}</paper-item>
                `
              )
            }
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
    `;
  }

  private _renderNodeActions(): TemplateResult {
    return html`
      <div class="card-actions">
        <paper-button @click="${this._showNodeInformation}"
          >Node Information</paper-button
        >
        <ha-call-service-button
          .hass="${this.hass}"
          domain="zha"
          service="reconfigure_device"
          .serviceData="${this._serviceData}"
          >Reconfigure Node</ha-call-service-button
        >
        <ha-service-description
          .hass="${this.hass}"
          domain="zha"
          service="reconfigure_device"
          ?hidden="${!this._showHelp}"
        />
        <ha-call-service-button
          .hass="${this.hass}"
          domain="zha"
          service="remove"
          .serviceData="${this._serviceData}"
          >Remove Node</ha-call-service-button
        >
        <ha-service-description
          .hass="${this.hass}"
          domain="zha"
          service="remove"
          ?hidden="${!this._showHelp}"
        />
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

  private _selectedNodeChanged(event: ItemSelectedEvent) {
    this._selectedNodeIndex = event!.target!.selected;
    this._selectedNode = this._nodes[this._selectedNodeIndex];
    this._selectedEntity = undefined;
    fireEvent(this, "zha-node-selected", { node: this._selectedNode });
    this._serviceData = this._computeNodeServiceData();
  }

  private _showNodeInformation(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._selectedNode!.entity_id,
    });
  }

  private _computeNodeServiceData() {
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

  private _onEntitySelected(entitySelectedEvent): void {
    this._selectedEntity = entitySelectedEvent.detail.entity;
  }

  private renderStyle(): TemplateResult {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    if (!this._ironFlex) {
      this._ironFlex = document.importNode(
        (document.getElementById("iron-flex")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    return html`
      ${this._ironFlex} ${this._haStyle}
      <style>
        .content {
          margin-top: 24px;
        }

        .node-info {
          margin-left: 16px;
        }

        .help-text {
          padding-left: 28px;
          padding-right: 28px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .node-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
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
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-node": ZhaNode;
  }
}

customElements.define("zha-node", ZhaNode);

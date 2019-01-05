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
import "../ha-config-section";

import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
import "../../../resources/ha-style";

import computeStateName from "../../../common/entity/compute_state_name";
import sortByName from "../../../common/entity/states_sort_by_name";

import { fireEvent } from "../../../common/dom/fire_event";

export class ZhaNode extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showDescription: boolean;
  public selectedNode: number;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;
  private _nodes: HassEntity[];

  constructor() {
    super();
    this.showDescription = false;
    this.selectedNode = -1;
    this._nodes = [];
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      showDescription: {},
      selectedNode: {},
    };
  }

  protected render(): TemplateResult {
    this._computeNodes(this.hass);
    return html`
      ${this.renderStyle()}
      <ha-config-section .is-wide="${this.isWide}">
        <div style="position: relative" slot="header">
          <span>ZHA Node Management</span>
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
          <div class="device-picker">
            <paper-dropdown-menu dynamic-align="" label="Nodes" class="flex">
              <paper-listbox
                slot="dropdown-content"
                @iron-select="${this._selectedNodeChanged}"
              >
                ${
                  this._nodes.map(
                    (entry) => html`
                      <paper-item
                        >${this._computeSelectCaption(entry)}</paper-item
                      >
                    `
                  )
                }
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${
            this.showDescription
              ? html`
                  <div style="color: grey; padding: 12px">
                    Select node to view per-node options
                  </div>
                `
              : ""
          }
          ${
            this._isNodeSelected()
              ? html`
                    <div class="card-actions">
                      <paper-button @click="${this._showNodeInformation}"
                        >Node Information</paper-button
                        <ha-call-service-button
                        .hass="${this.hass}"
                        domain="zha"
                        service="reconfigure_device"
                        .service-data="${this._computeNodeServiceData}"
                        >Reconfigure Node</ha-call-service-button
                      >
                ${
                  this.showDescription
                    ? html`
                        <ha-service-description
                          .hass="${this.hass}"
                          domain="zha"
                          service="reconfigure_device"
                        />
                      `
                    : ""
                }
                <ha-call-service-button
                .hass="${this.hass}"
                domain="zha"
                service="remove"
                .service-data="${this._computeNodeServiceData}"
                >Remove Node</ha-call-service-button
                >
                ${
                  this.showDescription
                    ? html`
                        <ha-service-description
                          .hass="${this.hass}"
                          domain="zha"
                          service="remove"
                        />
                      `
                    : ""
                }
            </div>
            `
              : ""
          }
        </paper-card>
      </ha-config-section>
    `;
  }

  private _onHelpTap(): void {
    this.showDescription = !this.showDescription;
  }

  private _selectedNodeChanged(event: Event) {
    console.dir(event);
  }
  private _isNodeSelected(): boolean {
    return this.selectedNode !== -1;
  }

  private _showNodeInformation(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._nodes[this.selectedNode].entity_id,
    });
  }

  private _computeNodeServiceData() {
    return { ieee_address: this._nodes[this.selectedNode].attributes.ieee };
  }

  private _computeSelectCaption(stateObj: HassEntity): string {
    return (
      computeStateName(stateObj) + " (Node:" + stateObj.attributes.ieee + ")"
    );
  }

  private _computeNodes(hass?: HomeAssistant): void {
    if (hass) {
      this._nodes = Object.keys(hass.states)
        .map((key) => hass.states[key])
        .filter((ent) => ent.entity_id.match("zha[.]"))
        .sort(sortByName);
    } else {
      this._nodes = [];
    }
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
          padding-left: 24px;
          padding-right: 24px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .device-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          padding-left: 24px;
          padding-right: 24px;
          padding-bottom: 24px;
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

import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-card/paper-card";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../ha-config-section";

import { HomeAssistant } from "../../../types";
import "../../../resources/ha-style";
import { HassEntity } from "home-assistant-js-websocket";
import { Cluster, Attribute, ItemSelectedEvent } from "./types";

export class ZHAClusterAttributes extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showHelp: boolean;
  public selectedCluster?: Cluster;
  private selectedEntity?: HassEntity;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;
  private _attributes: Attribute[];
  private _selectedAttributeIndex: number;

  constructor() {
    super();
    this.showHelp = false;
    this._selectedAttributeIndex = -1;
    this._attributes = [];
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      showHelp: {},
      selectedCluster: {},
      _attributes: {},
      _selectedAttributeIndex: {},
      selectedEntity: {},
    };
  }

  protected update(changedProperties: PropertyValues) {
    if (changedProperties.has("selectedCluster")) {
      this._attributes = [];
      this._selectedAttributeIndex = -1;
      this._fetchAttributesForCluster();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <ha-config-section .isWide="${this.isWide}">
        <div style="position: relative" slot="header">
          <span>Cluster Attributes</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          >
          </paper-icon-button>
        </div>
        <span slot="introduction">View and edit cluster attributes.</span>

        <paper-card class="content">
          ${this._renderAttributePicker()}
          ${
            this._selectedAttributeIndex !== -1
              ? this._renderAttributeInteractions()
              : ""
          }
        </paper-card>
      </ha-config-section>
    `;
  }

  private _renderAttributePicker(): TemplateResult {
    return html`
      <div class="attribute-picker">
        <paper-dropdown-menu
          label="Attributes of the selected cluster"
          dynamic-align=""
          class="flex"
        >
          <paper-listbox
            slot="dropdown-content"
            selected="${this._selectedAttributeIndex}"
            @iron-select="${this._selectedAttributeChanged}"
          >
            ${
              this._attributes.map(
                (entry) => html`
                  <paper-item
                    >${entry.name + " (id: " + entry.id + ")"}</paper-item
                  >
                `
              )
            }
          </paper-listbox>
        </paper-dropdown-menu>
      </div>

      <div ?hidden="${!this.showHelp}" style="color: grey; padding: 16px">
        Select an attribute to view or set its value
      </div>
    `;
  }

  private _renderAttributeInteractions(): TemplateResult {
    return html`
      <div class="input-text">
        <paper-input
          label="Value"
          type="string"
          value="{{ attributeValue }}"
          placeholder="Value"
        ></paper-input>
      </div>
      <div class="input-text">
        <paper-input
          label="Manufacturer code override"
          type="number"
          value="{{ manufacturerCodeOverride }}"
          placeholder="Value"
        ></paper-input>
      </div>
      <div class="card-actions">
        <paper-button>Get Zigbee Attribute</paper-button>
        <ha-call-service-button
          .hass="${this.hass}"
          domain="zha"
          service="set_zigbee_cluster_attribute"
          service-data="[[computeSetAttributeServiceData(attributeValue)]]"
          >Set Zigbee Attribute</ha-call-service-button
        >
        <ha-service-description
          .hass="${this.hass}"
          domain="zha"
          service="set_zigbee_cluster_attribute"
          ?hidden="${!this.showHelp}"
        ></ha-service-description>
      </div>
    `;
  }

  private async _fetchAttributesForCluster() {
    this._attributes = await this.hass!.callWS({
      type: "zha/entities/clusters/attributes",
      entity_id: this.selectedEntity!.entity_id,
      ieee: this.selectedEntity!.device_info.identifiers[0][1],
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
    });
  }

  private _onHelpTap(): void {
    this.showHelp = !this.showHelp;
  }

  private _selectedAttributeChanged(event: ItemSelectedEvent): void {
    this._selectedAttributeIndex = event.target!.selected;
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

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--google-red-500);
        }

        .attribute-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
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
        }

        [hidden] {
          display: none;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-attributes": ZHAClusterAttributes;
  }
}

customElements.define("zha-cluster-attributes", ZHAClusterAttributes);

import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import { HassEntity } from "home-assistant-js-websocket";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import {
  Attribute,
  Cluster,
  fetchAttributesForCluster,
  ReadAttributeServiceData,
  readAttributeValue,
  ZHADeviceEntity,
} from "../../../data/zha";
import "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import {
  ChangeEvent,
  ItemSelectedEvent,
  SetAttributeServiceData,
} from "./types";

export class ZHAClusterAttributes extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showHelp: boolean;
  public selectedNode?: HassEntity;
  public selectedEntity?: ZHADeviceEntity;
  public selectedCluster?: Cluster;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;
  private _attributes: Attribute[];
  private _selectedAttributeIndex: number;
  private _attributeValue?: any;
  private _manufacturerCodeOverride?: string | number;
  private _setAttributeServiceData?: SetAttributeServiceData;

  constructor() {
    super();
    this.showHelp = false;
    this._selectedAttributeIndex = -1;
    this._attributes = [];
    this._attributeValue = "";
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      showHelp: {},
      selectedNode: {},
      selectedEntity: {},
      selectedCluster: {},
      _attributes: {},
      _selectedAttributeIndex: {},
      _attributeValue: {},
      _manufacturerCodeOverride: {},
      _setAttributeServiceData: {},
    };
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedCluster")) {
      this._attributes = [];
      this._selectedAttributeIndex = -1;
      this._attributeValue = "";
      this._fetchAttributesForCluster();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
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
          <div class="attribute-picker">
            <paper-dropdown-menu
              label="Attributes of the selected cluster"
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._selectedAttributeIndex}"
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
          ${
            this.showHelp
              ? html`
                  <div style="color: grey; padding: 16px">
                    Select an attribute to view or set its value
                  </div>
                `
              : ""
          }
          ${
            this._selectedAttributeIndex !== -1
              ? this._renderAttributeInteractions()
              : ""
          }
        </paper-card>
      </ha-config-section>
    `;
  }

  private _renderAttributeInteractions(): TemplateResult {
    return html`
      <div class="input-text">
        <paper-input
          label="Value"
          type="string"
          .value="${this._attributeValue}"
          @value-changed="${this._onAttributeValueChanged}"
          placeholder="Value"
        ></paper-input>
      </div>
      <div class="input-text">
        <paper-input
          label="Manufacturer code override"
          type="number"
          .value="${this._manufacturerCodeOverride}"
          @value-changed="${this._onManufacturerCodeOverrideChanged}"
          placeholder="Value"
        ></paper-input>
      </div>
      <div class="card-actions">
        <paper-button @click="${this._onGetZigbeeAttributeClick}"
          >Get Zigbee Attribute</paper-button
        >
        <ha-call-service-button
          .hass="${this.hass}"
          domain="zha"
          service="set_zigbee_cluster_attribute"
          .serviceData="${this._setAttributeServiceData}"
          >Set Zigbee Attribute</ha-call-service-button
        >
        ${
          this.showHelp
            ? html`
                <ha-service-description
                  .hass="${this.hass}"
                  domain="zha"
                  service="set_zigbee_cluster_attribute"
                ></ha-service-description>
              `
            : ""
        }
      </div>
    `;
  }

  private async _fetchAttributesForCluster(): Promise<void> {
    if (this.selectedEntity && this.selectedCluster && this.hass) {
      this._attributes = await fetchAttributesForCluster(
        this.hass,
        this.selectedEntity!.entity_id,
        this.selectedEntity!.device_info!.identifiers[0][1],
        this.selectedCluster!.id,
        this.selectedCluster!.type
      );
    }
  }

  private _computeReadAttributeServiceData():
    | ReadAttributeServiceData
    | undefined {
    if (!this.selectedEntity || !this.selectedCluster || !this.selectedNode) {
      return;
    }
    return {
      entity_id: this.selectedEntity!.entity_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._attributes[this._selectedAttributeIndex].id,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : this.selectedNode!.attributes.manufacturer_code,
    };
  }

  private _computeSetAttributeServiceData():
    | SetAttributeServiceData
    | undefined {
    if (!this.selectedEntity || !this.selectedCluster || !this.selectedNode) {
      return;
    }
    return {
      entity_id: this.selectedEntity!.entity_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._attributes[this._selectedAttributeIndex].id,
      value: this._attributeValue,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : this.selectedNode!.attributes.manufacturer_code,
    };
  }

  private _onAttributeValueChanged(value: ChangeEvent): void {
    this._attributeValue = value.detail!.value;
    this._setAttributeServiceData = this._computeSetAttributeServiceData();
  }

  private _onManufacturerCodeOverrideChanged(value: ChangeEvent): void {
    this._manufacturerCodeOverride = value.detail!.value;
    this._setAttributeServiceData = this._computeSetAttributeServiceData();
  }

  private async _onGetZigbeeAttributeClick(): Promise<void> {
    const data = this._computeReadAttributeServiceData();
    if (data && this.hass) {
      this._attributeValue = await readAttributeValue(this.hass, data);
    }
  }

  private _onHelpTap(): void {
    this.showHelp = !this.showHelp;
  }

  private _selectedAttributeChanged(event: ItemSelectedEvent): void {
    this._selectedAttributeIndex = event.target!.selected;
    this._attributeValue = "";
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

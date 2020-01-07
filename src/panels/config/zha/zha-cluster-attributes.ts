import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/ha-card";
import "../ha-config-section";
import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  property,
} from "lit-element";

import {
  Attribute,
  Cluster,
  fetchAttributesForCluster,
  ReadAttributeServiceData,
  readAttributeValue,
  ZHADevice,
} from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { formatAsPaddedHex } from "./functions";
import {
  ChangeEvent,
  ItemSelectedEvent,
  SetAttributeServiceData,
} from "./types";

export class ZHAClusterAttributes extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public showHelp = false;
  @property() public selectedNode?: ZHADevice;
  @property() public selectedCluster?: Cluster;
  @property() private _attributes: Attribute[] = [];
  @property() private _selectedAttributeIndex = -1;
  @property() private _attributeValue?: any = "";
  @property() private _manufacturerCodeOverride?: string | number;
  @property() private _setAttributeServiceData?: SetAttributeServiceData;

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
      <ha-config-section .isWide="${this.isWide}">
        <div slot="header">
          <span>
            ${this.hass!.localize(
              "ui.panel.config.zha.cluster_attributes.header"
            )}
          </span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          >
          </paper-icon-button>
        </div>
        <span slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.introduction"
          )}
        </span>

        <ha-card class="content">
          <div class="attribute-picker">
            <paper-dropdown-menu
              label="${this.hass!.localize(
                "ui.panel.config.zha.cluster_attributes.attributes_of_cluster"
              )}"
              class="menu"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._selectedAttributeIndex}"
                @iron-select="${this._selectedAttributeChanged}"
              >
                ${this._attributes.map(
                  (entry) => html`
                    <paper-item
                      >${entry.name +
                        " (id: " +
                        formatAsPaddedHex(entry.id) +
                        ")"}</paper-item
                    >
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this.showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.cluster_attributes.help_attribute_dropdown"
                  )}
                </div>
              `
            : ""}
          ${this._selectedAttributeIndex !== -1
            ? this._renderAttributeInteractions()
            : ""}
        </ha-card>
      </ha-config-section>
    `;
  }

  private _renderAttributeInteractions(): TemplateResult {
    return html`
      <div class="input-text">
        <paper-input
          label="${this.hass!.localize("ui.panel.config.zha.common.value")}"
          type="string"
          .value="${this._attributeValue}"
          @value-changed="${this._onAttributeValueChanged}"
          placeholder="${this.hass!.localize(
            "ui.panel.config.zha.common.value"
          )}"
        ></paper-input>
      </div>
      <div class="input-text">
        <paper-input
          label="${this.hass!.localize(
            "ui.panel.config.zha.common.manufacturer_code_override"
          )}"
          type="number"
          .value="${this._manufacturerCodeOverride}"
          @value-changed="${this._onManufacturerCodeOverrideChanged}"
          placeholder="${this.hass!.localize(
            "ui.panel.config.zha.common.value"
          )}"
        ></paper-input>
      </div>
      <div class="card-actions">
        <mwc-button @click="${this._onGetZigbeeAttributeClick}">
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.get_zigbee_attribute"
          )}
        </mwc-button>
        ${this.showHelp
          ? html`
              <div class="help-text2">
                ${this.hass!.localize(
                  "ui.panel.config.zha.cluster_attributes.help_get_zigbee_attribute"
                )}
              </div>
            `
          : ""}
        <ha-call-service-button
          .hass="${this.hass}"
          domain="zha"
          service="set_zigbee_cluster_attribute"
          .serviceData="${this._setAttributeServiceData}"
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.set_zigbee_attribute"
          )}
        </ha-call-service-button>
        ${this.showHelp
          ? html`
              <ha-service-description
                .hass="${this.hass}"
                domain="zha"
                service="set_zigbee_cluster_attribute"
                class="help-text2"
              ></ha-service-description>
            `
          : ""}
      </div>
    `;
  }

  private async _fetchAttributesForCluster(): Promise<void> {
    if (this.selectedNode && this.selectedCluster && this.hass) {
      this._attributes = await fetchAttributesForCluster(
        this.hass,
        this.selectedNode!.ieee,
        this.selectedCluster!.endpoint_id,
        this.selectedCluster!.id,
        this.selectedCluster!.type
      );
      this._attributes.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    }
  }

  private _computeReadAttributeServiceData():
    | ReadAttributeServiceData
    | undefined {
    if (!this.selectedCluster || !this.selectedNode) {
      return;
    }
    return {
      ieee: this.selectedNode!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._attributes[this._selectedAttributeIndex].id,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : undefined,
    };
  }

  private _computeSetAttributeServiceData():
    | SetAttributeServiceData
    | undefined {
    if (!this.selectedCluster || !this.selectedNode) {
      return;
    }
    return {
      ieee: this.selectedNode!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._attributes[this._selectedAttributeIndex].id,
      value: this._attributeValue,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : undefined,
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .menu {
          width: 100%;
        }

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

        .attribute-picker {
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
        .help-text {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 16px;
        }
        .help-text2 {
          color: grey;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-attributes": ZHAClusterAttributes;
  }
}

customElements.define("zha-cluster-attributes", ZHAClusterAttributes);

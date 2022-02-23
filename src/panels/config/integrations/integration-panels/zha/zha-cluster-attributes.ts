import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiHelpCircle } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-select";
import "../../../../../components/ha-service-description";
import {
  Attribute,
  Cluster,
  fetchAttributesForCluster,
  ReadAttributeServiceData,
  readAttributeValue,
  ZHADevice,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { formatAsPaddedHex } from "./functions";
import {
  ChangeEvent,
  ItemSelectedEvent,
  SetAttributeServiceData,
} from "./types";

export class ZHAClusterAttributes extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public showHelp = false;

  @property() public selectedNode?: ZHADevice;

  @property() public selectedCluster?: Cluster;

  @state() private _attributes: Attribute[] = [];

  @state() private _selectedAttributeId?: number;

  @state() private _attributeValue?: any = "";

  @state() private _manufacturerCodeOverride?: string | number;

  @state()
  private _setAttributeServiceData?: SetAttributeServiceData;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedCluster")) {
      this._attributes = [];
      this._selectedAttributeId = undefined;
      this._attributeValue = "";
      this._fetchAttributesForCluster();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide=${this.isWide}>
        <div class="header" slot="header">
          <span>
            ${this.hass!.localize(
              "ui.panel.config.zha.cluster_attributes.header"
            )}
          </span>
          <ha-icon-button
            class="toggle-help-icon"
            @click=${this._onHelpTap}
            .path=${mdiHelpCircle}
            .label=${this.hass!.localize("ui.common.help")}
          >
          </ha-icon-button>
        </div>
        <span slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.introduction"
          )}
        </span>

        <ha-card class="content">
          <div class="attribute-picker">
            <ha-select
              .label=${this.hass!.localize(
                "ui.panel.config.zha.cluster_attributes.attributes_of_cluster"
              )}
              class="menu"
              .value=${String(this._selectedAttributeId)}
              @selected=${this._selectedAttributeChanged}
              @closed=${stopPropagation}
              fixedMenuPosition
              naturalMenuWidth
            >
              ${this._attributes.map(
                (entry) => html`
                  <mwc-list-item .value=${String(entry.id)}>
                    ${entry.name + " (id: " + formatAsPaddedHex(entry.id) + ")"}
                  </mwc-list-item>
                `
              )}
            </ha-select>
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
          ${this._selectedAttributeId !== undefined
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
          label=${this.hass!.localize("ui.panel.config.zha.common.value")}
          type="string"
          .value=${this._attributeValue}
          @value-changed=${this._onAttributeValueChanged}
          placeholder=${this.hass!.localize("ui.panel.config.zha.common.value")}
        ></paper-input>
      </div>
      <div class="input-text">
        <paper-input
          label=${this.hass!.localize(
            "ui.panel.config.zha.common.manufacturer_code_override"
          )}
          type="number"
          .value=${this._manufacturerCodeOverride}
          @value-changed=${this._onManufacturerCodeOverrideChanged}
          placeholder=${this.hass!.localize("ui.panel.config.zha.common.value")}
        ></paper-input>
      </div>
      <div class="card-actions">
        <mwc-button @click=${this._onGetZigbeeAttributeClick}>
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
          .hass=${this.hass}
          domain="zha"
          service="set_zigbee_cluster_attribute"
          .serviceData=${this._setAttributeServiceData}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.set_zigbee_attribute"
          )}
        </ha-call-service-button>
        ${this.showHelp
          ? html`
              <ha-service-description
                .hass=${this.hass}
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
      this._attributes.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private _computeReadAttributeServiceData():
    | ReadAttributeServiceData
    | undefined {
    if (!this.selectedCluster || !this.selectedNode) {
      return undefined;
    }
    return {
      ieee: this.selectedNode!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._selectedAttributeId!,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : undefined,
    };
  }

  private _computeSetAttributeServiceData():
    | SetAttributeServiceData
    | undefined {
    if (!this.selectedCluster || !this.selectedNode) {
      return undefined;
    }
    return {
      ieee: this.selectedNode!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._selectedAttributeId!,
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
    this._selectedAttributeId = Number(event.target!.value);
    this._attributeValue = "";
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-select {
          margin-top: 16px;
        }

        .menu {
          width: 100%;
        }

        .content {
          margin-top: 24px;
        }

        ha-card {
          max-width: 680px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .attribute-picker {
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

        .header {
          flex-grow: 1;
        }

        .toggle-help-icon {
          float: right;
          top: -6px;
          right: 0;
          padding-right: 0px;
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

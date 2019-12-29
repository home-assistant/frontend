import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/ha-card";
import "../ha-config-section";
import "@material/mwc-button/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import {
  bindDeviceToGroup,
  unbindDeviceFromGroup,
  ZHADevice,
  ZHAGroup,
  Cluster,
  fetchClustersForZhaNode,
} from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ItemSelectedEvent } from "./types";
import "@polymer/paper-item/paper-item";
import { computeClusterKey } from "./functions";

@customElement("zha-group-binding-control")
export class ZHAGroupBindingControl extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public selectedDevice?: ZHADevice;
  @property() private _showHelp: boolean = false;
  @property() private _bindTargetIndex: number = -1;
  @property() private groups: ZHAGroup[] = [];
  @property() private _selectedClusterIndex = -1;
  @property() private _clusters: Cluster[] = [];
  private _groupToBind?: ZHAGroup;
  private _clusterToBind?: Cluster;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._bindTargetIndex = -1;
      this._selectedClusterIndex = -1;
      this._fetchClustersForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span>Group Binding</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          >
          </paper-icon-button>
        </div>
        <span slot="introduction">Bind and unbind groups.</span>

        <ha-card class="content">
          <div class="command-picker">
            <paper-dropdown-menu label="Bindable Groups" class="flex">
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._bindTargetIndex}"
                @iron-select="${this._bindTargetIndexChanged}"
              >
                ${this.groups.map(
                  (group) => html`
                    <paper-item>${group.name}</paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._showHelp
            ? html`
                <div class="help-text">
                  Select a group to issue a bind command.
                </div>
              `
            : ""}
          <div class="command-picker">
            <paper-dropdown-menu
              label="${this.hass!.localize(
                "ui.panel.config.zha.common.clusters"
              )}"
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._selectedClusterIndex}"
                @iron-select="${this._selectedClusterChanged}"
              >
                ${this._clusters.map(
                  (entry) => html`
                    <paper-item>${computeClusterKey(entry)}</paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.clusters.help_cluster_dropdown"
                  )}
                </div>
              `
            : ""}
          <div class="card-actions">
            <mwc-button
              @click="${this._onBindGroupClick}"
              ?disabled="${!(
                this._groupToBind &&
                this._clusterToBind &&
                this.selectedDevice
              )}"
              >Bind Group</mwc-button
            >
            ${this._showHelp
              ? html`
                  <div class="helpText">
                    Bind group to the selected device.
                  </div>
                `
              : ""}
            <mwc-button
              @click="${this._onUnbindGroupClick}"
              ?disabled="${!(
                this._groupToBind &&
                this._clusterToBind &&
                this.selectedDevice
              )}"
              >Unbind Group</mwc-button
            >
            ${this._showHelp
              ? html`
                  <div class="helpText">
                    Unbind group to the selected device.
                  </div>
                `
              : ""}
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _bindTargetIndexChanged(event: ItemSelectedEvent): void {
    this._bindTargetIndex = event.target!.selected;
    this._groupToBind =
      this._bindTargetIndex === -1
        ? undefined
        : this.groups[this._bindTargetIndex];
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private async _onBindGroupClick(): Promise<void> {
    if (
      this.hass &&
      this._groupToBind &&
      this._clusterToBind &&
      this.selectedDevice
    ) {
      await bindDeviceToGroup(
        this.hass,
        this.selectedDevice.ieee,
        this._groupToBind.group_id,
        [this._clusterToBind]
      );
    }
  }

  private async _onUnbindGroupClick(): Promise<void> {
    if (
      this.hass &&
      this._groupToBind &&
      this._clusterToBind &&
      this.selectedDevice
    ) {
      await unbindDeviceFromGroup(
        this.hass,
        this.selectedDevice.ieee,
        this._groupToBind.group_id,
        [this._clusterToBind]
      );
    }
  }

  private _selectedClusterChanged(event: ItemSelectedEvent): void {
    this._selectedClusterIndex = event.target!.selected;
    this._clusterToBind =
      this._selectedClusterIndex === -1
        ? undefined
        : this._clusters[this._selectedClusterIndex];
  }

  private async _fetchClustersForZhaNode(): Promise<void> {
    if (this.hass) {
      this._clusters = await fetchClustersForZhaNode(
        this.hass,
        this.selectedDevice!.ieee
      );
      this._clusters
        .filter((cluster) => {
          return cluster.type.toLowerCase() === "out";
        })
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
    }
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

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--google-red-500);
        }

        .command-picker {
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

        .sectionHeader {
          position: relative;
        }

        .helpText {
          color: grey;
          padding: 16px;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-group-binding-control": ZHAGroupBindingControl;
  }
}

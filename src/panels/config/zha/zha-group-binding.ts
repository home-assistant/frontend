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
import "./zha-clusters-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ItemSelectedEvent } from "./types";
import "@polymer/paper-item/paper-item";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";

@customElement("zha-group-binding-control")
export class ZHAGroupBindingControl extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public narrow?: boolean;
  @property() public selectedDevice?: ZHADevice;
  @property() private _showHelp: boolean = false;
  @property() private _bindTargetIndex: number = -1;
  @property() private groups: ZHAGroup[] = [];
  @property() private _selectedClusters: string[] = [];
  @property() private _clusters: Cluster[] = [];
  private _groupToBind?: ZHAGroup;
  private _clustersToBind?: Cluster[];

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._bindTargetIndex = -1;
      this._selectedClusters = [];
      this._clustersToBind = [];
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
            <paper-dropdown-menu label="Bindable Groups" class="menu">
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
                <div class="helpText">
                  Select a group to issue a bind command.
                </div>
              `
            : ""}
          <div class="command-picker">
            <zha-clusters-data-table
              .hass=${this.hass}
              .narrow=${this.narrow}
              .clusters=${this._clusters}
              @selection-changed=${this._handleClusterSelectionChanged}
              class="menu"
            ></zha-clusters-data-table>
          </div>
          ${this._showHelp
            ? html`
                <div class="helpText">
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
                this._clustersToBind &&
                this._clustersToBind?.length > 0 &&
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
                this._clustersToBind &&
                this._clustersToBind?.length > 0 &&
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
      this._clustersToBind &&
      this._clustersToBind?.length > 0 &&
      this.selectedDevice
    ) {
      await bindDeviceToGroup(
        this.hass,
        this.selectedDevice.ieee,
        this._groupToBind.group_id,
        this._clustersToBind
      );
    }
  }

  private async _onUnbindGroupClick(): Promise<void> {
    if (
      this.hass &&
      this._groupToBind &&
      this._clustersToBind &&
      this._clustersToBind?.length > 0 &&
      this.selectedDevice
    ) {
      await unbindDeviceFromGroup(
        this.hass,
        this.selectedDevice.ieee,
        this._groupToBind.group_id,
        this._clustersToBind
      );
    }
  }

  private _handleClusterSelectionChanged(event: CustomEvent): void {
    const changedSelection = event.detail as SelectionChangedEvent;
    const clusterId = changedSelection.id;
    if (
      changedSelection.selected &&
      !this._selectedClusters.includes(clusterId)
    ) {
      this._selectedClusters.push(clusterId);
    } else {
      const index = this._selectedClusters.indexOf(clusterId);
      if (index !== -1) {
        this._selectedClusters.splice(index, 1);
      }
    }
    this._selectedClusters = [...this._selectedClusters];
    this._clustersToBind = [];
    for (const clusterIndex of this._selectedClusters) {
      const selectedCluster = this._clusters.find((cluster) => {
        return clusterIndex === cluster.endpoint_id + "-" + cluster.id;
      });
      this._clustersToBind.push(selectedCluster!);
    }
  }

  private async _fetchClustersForZhaNode(): Promise<void> {
    if (this.hass) {
      this._clusters = await fetchClustersForZhaNode(
        this.hass,
        this.selectedDevice!.ieee
      );
      this._clusters = this._clusters
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

        .command-picker {
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
          flex-grow: 1;
        }

        .helpText {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .toggle-help-icon {
          float: right;
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

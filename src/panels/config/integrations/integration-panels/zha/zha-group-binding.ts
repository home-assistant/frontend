import "@material/mwc-button/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "../../../../../components/ha-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-call-service-button";
import { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import "../../../../../components/ha-service-description";
import {
  bindDeviceToGroup,
  Cluster,
  fetchClustersForZhaNode,
  unbindDeviceFromGroup,
  ZHADevice,
  ZHAGroup,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { ItemSelectedEvent } from "./types";
import "./zha-clusters-data-table";
import type { ZHAClustersDataTable } from "./zha-clusters-data-table";

@customElement("zha-group-binding-control")
export class ZHAGroupBindingControl extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow?: boolean;

  @property() public selectedDevice?: ZHADevice;

  @internalProperty() private _showHelp = false;

  @internalProperty() private _bindTargetIndex = -1;

  @internalProperty() private groups: ZHAGroup[] = [];

  @internalProperty() private _selectedClusters: string[] = [];

  @internalProperty() private _clusters: Cluster[] = [];

  private _groupToBind?: ZHAGroup;

  private _clustersToBind?: Cluster[];

  @query("zha-clusters-data-table", true)
  private _zhaClustersDataTable!: ZHAClustersDataTable;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._bindTargetIndex = -1;
      this._selectedClusters = [];
      this._clustersToBind = [];
      this._fetchClustersForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span
            >${this.hass!.localize(
              "ui.panel.config.zha.group_binding.header"
            )}</span
          >
          <ha-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          >
          </ha-icon-button>
        </div>
        <span slot="introduction"
          >${this.hass!.localize(
            "ui.panel.config.zha.group_binding.introduction"
          )}</span
        >

        <ha-card class="content">
          <div class="command-picker">
            <paper-dropdown-menu
              .label=${this.hass!.localize(
                "ui.panel.config.zha.group_binding.group_picker_label"
              )}
              class="menu"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._bindTargetIndex}"
                @iron-select="${this._bindTargetIndexChanged}"
              >
                ${this.groups.map(
                  (group) => html` <paper-item>${group.name}</paper-item> `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._showHelp
            ? html`
                <div class="helpText">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.group_binding.group_picker_help"
                  )}
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
                    "ui.panel.config.zha.group_binding.cluster_selection_help"
                  )}
                </div>
              `
            : ""}
          <div class="card-actions">
            <mwc-button
              @click="${this._onBindGroupClick}"
              .disabled="${!this._canBind}"
              >${this.hass!.localize(
                "ui.panel.config.zha.group_binding.bind_button_label"
              )}</mwc-button
            >
            ${this._showHelp
              ? html`
                  <div class="helpText">
                    ${this.hass!.localize(
                      "ui.panel.config.zha.group_binding.bind_button_help"
                    )}
                  </div>
                `
              : ""}
            <mwc-button
              @click="${this._onUnbindGroupClick}"
              .disabled="${!this._canBind}"
              >${this.hass!.localize(
                "ui.panel.config.zha.group_binding.unbind_button_label"
              )}</mwc-button
            >
            ${this._showHelp
              ? html`
                  <div class="helpText">
                    ${this.hass!.localize(
                      "ui.panel.config.zha.group_binding.unbind_button_help"
                    )}
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
    if (this.hass && this._canBind) {
      await bindDeviceToGroup(
        this.hass,
        this.selectedDevice!.ieee,
        this._groupToBind!.group_id,
        this._clustersToBind!
      );
      this._zhaClustersDataTable.clearSelection();
    }
  }

  private async _onUnbindGroupClick(): Promise<void> {
    if (this.hass && this._canBind) {
      await unbindDeviceFromGroup(
        this.hass,
        this.selectedDevice!.ieee,
        this._groupToBind!.group_id,
        this._clustersToBind!
      );
      this._zhaClustersDataTable.clearSelection();
    }
  }

  private _handleClusterSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedClusters = ev.detail.value;

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

  private get _canBind(): boolean {
    return Boolean(
      this._groupToBind &&
        this._clustersToBind &&
        this._clustersToBind?.length > 0 &&
        this.selectedDevice
    );
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
          max-width: 680px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-group-binding-control": ZHAGroupBindingControl;
  }
}

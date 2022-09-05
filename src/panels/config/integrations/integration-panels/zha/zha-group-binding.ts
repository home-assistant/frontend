import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import {
  bindDeviceToGroup,
  Cluster,
  fetchClustersForZhaDevice,
  unbindDeviceFromGroup,
  ZHADevice,
  ZHAGroup,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { ItemSelectedEvent } from "./types";
import "./zha-clusters-data-table";
import type { ZHAClustersDataTable } from "./zha-clusters-data-table";

@customElement("zha-group-binding-control")
export class ZHAGroupBindingControl extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public device?: ZHADevice;

  @state() private _bindTargetIndex = -1;

  @state() private groups: ZHAGroup[] = [];

  @state() private _selectedClusters: string[] = [];

  @state() private _clusters: Cluster[] = [];

  private _groupToBind?: ZHAGroup;

  private _clustersToBind?: Cluster[];

  @query("zha-clusters-data-table", true)
  private _zhaClustersDataTable!: ZHAClustersDataTable;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
      this._bindTargetIndex = -1;
      this._selectedClusters = [];
      this._clustersToBind = [];
      this._fetchClustersForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
        <ha-card class="content">
          <div class="command-picker">
            <ha-select
              .label=${this.hass!.localize(
                "ui.panel.config.zha.group_binding.group_picker_label"
              )}
              class="menu"
              .value=${String(this._bindTargetIndex)}
              @selected=${this._bindTargetIndexChanged}
              @closed=${stopPropagation}
              fixedMenuPosition
              naturalMenuWidth
            >
              ${this.groups.map(
                (group, idx) =>
                  html`<mwc-list-item .value=${String(idx)}
                    >${group.name}</mwc-list-item
                  > `
              )}
            </ha-select>
          </div>
          <div class="command-picker">
            <zha-clusters-data-table
              .hass=${this.hass}
              .clusters=${this._clusters}
              @selection-changed=${this._handleClusterSelectionChanged}
              class="menu"
            ></zha-clusters-data-table>
          </div>
          <div class="card-actions">
            <mwc-button
              @click=${this._onBindGroupClick}
              .disabled=${!this._canBind}
              >${this.hass!.localize(
                "ui.panel.config.zha.group_binding.bind_button_label"
              )}</mwc-button
            >
            <mwc-button
              @click=${this._onUnbindGroupClick}
              .disabled=${!this._canBind}
              >${this.hass!.localize(
                "ui.panel.config.zha.group_binding.unbind_button_label"
              )}</mwc-button
            >
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _bindTargetIndexChanged(event: ItemSelectedEvent): void {
    this._bindTargetIndex = Number(event.target!.value);
    this._groupToBind =
      this._bindTargetIndex === -1
        ? undefined
        : this.groups[this._bindTargetIndex];
  }

  private async _onBindGroupClick(): Promise<void> {
    if (this.hass && this._canBind) {
      await bindDeviceToGroup(
        this.hass,
        this.device!.ieee,
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
        this.device!.ieee,
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
      const selectedCluster = this._clusters.find(
        (cluster) => clusterIndex === cluster.endpoint_id + "-" + cluster.id
      );
      this._clustersToBind.push(selectedCluster!);
    }
  }

  private async _fetchClustersForZhaNode(): Promise<void> {
    if (this.hass) {
      this._clusters = await fetchClustersForZhaDevice(
        this.hass,
        this.device!.ieee
      );
      this._clusters = this._clusters
        .filter((cluster) => cluster.type.toLowerCase() === "out")
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private get _canBind(): boolean {
    return Boolean(
      this._groupToBind &&
        this._clustersToBind &&
        this._clustersToBind?.length > 0 &&
        this.device
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .menu {
          width: 100%;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-group-binding-control": ZHAGroupBindingControl;
  }
}

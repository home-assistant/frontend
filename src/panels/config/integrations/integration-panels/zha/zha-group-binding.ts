import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-progress-button";
import type { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type { Cluster, ZHADevice, ZHAGroup } from "../../../../../data/zha";
import {
  bindDeviceToGroup,
  fetchClustersForZhaDevice,
  unbindDeviceFromGroup,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "./zha-clusters-data-table";
import type { ZHAClustersDataTable } from "./zha-clusters-data-table";

@customElement("zha-group-binding-control")
export class ZHAGroupBindingControl extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @state() private _bindTargetIndex = -1;

  @state() private groups: ZHAGroup[] = [];

  @state() private _selectedClusters: string[] = [];

  @state() private _clusters: Cluster[] = [];

  @state() private _bindingOperationInProgress = false;

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
    super.updated(changedProperties);
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
              .options=${this.groups.map((group, idx) => ({
                value: String(idx),
                label: group.name,
              }))}
            >
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
          <ha-progress-button
            @click=${this._onUnbindGroupClick}
            .disabled=${!this._canBind || this._bindingOperationInProgress}
            variant="danger"
            appearance="plain"
          >
            ${this.hass!.localize(
              "ui.panel.config.zha.group_binding.unbind_button_label"
            )}
          </ha-progress-button>
              <ha-progress-button
                      @click=${this._onBindGroupClick}
                      .disabled=${!this._canBind || this._bindingOperationInProgress}
              >
                  ${this.hass!.localize(
                    "ui.panel.config.zha.group_binding.bind_button_label"
                  )}
              </ha-progress-button>
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _bindTargetIndexChanged(event: HaSelectSelectEvent): void {
    this._bindTargetIndex = Number(event.detail.value);
    this._groupToBind =
      this._bindTargetIndex === -1
        ? undefined
        : this.groups[this._bindTargetIndex];
  }

  private async _onBindGroupClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    if (this.hass && this._canBind) {
      this._bindingOperationInProgress = true;
      button.progress = true;
      try {
        await bindDeviceToGroup(
          this.hass,
          this.device!.ieee,
          this._groupToBind!.group_id,
          this._clustersToBind!
        );
        this._zhaClustersDataTable.clearSelection();
        button.actionSuccess();
      } catch (_err: any) {
        button.actionError();
      } finally {
        this._bindingOperationInProgress = false;
        button.progress = false;
      }
    }
  }

  private async _onUnbindGroupClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    if (this.hass && this._canBind) {
      this._bindingOperationInProgress = true;
      button.progress = true;
      try {
        await unbindDeviceFromGroup(
          this.hass,
          this.device!.ieee,
          this._groupToBind!.group_id,
          this._clustersToBind!
        );
        this._zhaClustersDataTable.clearSelection();
        button.actionSuccess();
      } catch (_err: any) {
        button.actionError();
      } finally {
        this._bindingOperationInProgress = false;
        button.progress = false;
      }
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

        .content {
          padding-top: var(--ha-space-2);
        }

        .command-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .sectionHeader {
          flex-grow: 1;
        }

        .card-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--ha-space-1);
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

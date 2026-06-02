import { consume, type ContextType } from "@lit/context";
import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list";
import "../../../../../components/input/ha-input-search";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../../../components/item/ha-list-item-option";
import "../../../../../components/list/ha-list-selectable";
import type { HaListSelectable } from "../../../../../components/list/ha-list-selectable";
import type { HaListSelectedDetail } from "../../../../../components/list/types";
import {
  areasContext,
  internationalizationContext,
} from "../../../../../data/context";
import type {
  ZHADeviceEndpoint,
  ZHAEntityReference,
} from "../../../../../data/zha";

export interface DeviceEndpointRowData {
  id: string;
  name: string;
  area: string | undefined;
  model: string;
  manufacturer: string;
  endpoint_id: number;
  entities: ZHAEntityReference[];
  ieee: string;
  dev_id: string;
}

export interface DeviceEndpointSelectionChangedEvent {
  value: string[];
}

@customElement("zha-device-endpoint-list")
export class ZHADeviceEndpointList extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public selectable = false;

  @property({ type: Boolean }) public scrollable = false;

  @property({ attribute: false }) public emptyText?: string;

  @property({ attribute: "show-device-link", type: Boolean })
  public showDeviceLink = false;

  @property({ attribute: false })
  public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _filter = "";

  @state() private _selectedDeviceIds: string[] = [];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @query("ha-list-selectable") private _list?: HaListSelectable;

  public clearSelection() {
    this._selectedDeviceIds = [];
    this._list?.clearSelection();
    this._fireSelectionChanged();
  }

  protected render(): TemplateResult {
    const allDeviceEndpoints = this._deviceEndpointRows;
    const deviceEndpoints = this._filterDeviceEndpoints(allDeviceEndpoints);
    const showSearch = allDeviceEndpoints.length > 5 || this._filter;

    return html`
      <ha-card
        class=${`${showSearch ? "searchable" : ""} ${
          this.scrollable ? "scrollable" : ""
        }`}
      >
        ${showSearch
          ? html`
              <div class="search">
                <ha-input-search
                  appearance="outlined"
                  .value=${this._filter}
                  @input=${this._handleFilterChanged}
                ></ha-input-search>
              </div>
            `
          : ""}
        ${deviceEndpoints.length
          ? html`
              ${this.selectable
                ? html`
                    <ha-list-selectable
                      multi
                      @ha-list-selected=${this._handleListSelectionChanged}
                    >
                      ${repeat(
                        deviceEndpoints,
                        (deviceEndpoint) => deviceEndpoint.id,
                        (deviceEndpoint) =>
                          this._renderSelectableListRow(deviceEndpoint)
                      )}
                    </ha-list-selectable>
                  `
                : html`
                    <ha-list>
                      ${repeat(
                        deviceEndpoints,
                        (deviceEndpoint) => deviceEndpoint.id,
                        (deviceEndpoint) =>
                          this._renderReadonlyListRow(deviceEndpoint)
                      )}
                    </ha-list>
                  `}
            `
          : html`
              <div class="empty-list">
                ${this._filter
                  ? this._i18n.localize(
                      "ui.panel.config.zha.groups.no_devices_found"
                    )
                  : this.emptyText ||
                    this._i18n.localize("ui.components.data-table.no-data")}
              </div>
            `}
      </ha-card>
    `;
  }

  private get _deviceEndpointRows(): DeviceEndpointRowData[] {
    return this.deviceEndpoints.map((deviceEndpoint) => ({
      name: deviceEndpoint.device.user_given_name || deviceEndpoint.device.name,
      area: deviceEndpoint.device.area_id
        ? this._areas[deviceEndpoint.device.area_id]?.name
        : undefined,
      model: deviceEndpoint.device.model,
      manufacturer: deviceEndpoint.device.manufacturer,
      id: `${deviceEndpoint.device.ieee}_${deviceEndpoint.endpoint_id}`,
      ieee: deviceEndpoint.device.ieee,
      endpoint_id: deviceEndpoint.endpoint_id,
      entities: deviceEndpoint.entities,
      dev_id: deviceEndpoint.device.device_reg_id,
    }));
  }

  private _renderSelectableListRow(
    deviceEndpoint: DeviceEndpointRowData
  ): TemplateResult {
    const selected = this._selectedDeviceIds.includes(deviceEndpoint.id);

    return html`
      <ha-list-item-option
        appearance="checkbox"
        class="device-row"
        .value=${deviceEndpoint.id}
        .selected=${selected}
      >
        <span slot="headline">${deviceEndpoint.name}</span>
        <span slot="supporting-text">
          ${this._deviceEndpointDetails(deviceEndpoint)}
        </span>
        ${this.showDeviceLink
          ? html`
              <ha-icon-button
                slot="end"
                .path=${mdiOpenInNew}
                .href=${`/config/devices/device/${deviceEndpoint.dev_id}`}
                .label=${this._i18n.localize(
                  "ui.panel.config.zha.groups.open_device"
                )}
                @click=${this._stopPropagation}
              ></ha-icon-button>
            `
          : nothing}
      </ha-list-item-option>
    `;
  }

  private _renderReadonlyListRow(
    deviceEndpoint: DeviceEndpointRowData
  ): TemplateResult {
    return html`
      <ha-list-item-base class="device-row">
        <span slot="headline">${deviceEndpoint.name}</span>
        <span slot="supporting-text">
          ${this._deviceEndpointDetails(deviceEndpoint)}
        </span>
        ${this.showDeviceLink
          ? html`
              <ha-icon-button
                slot="end"
                .path=${mdiOpenInNew}
                .href=${`/config/devices/device/${deviceEndpoint.dev_id}`}
                .label=${this._i18n.localize(
                  "ui.panel.config.zha.groups.open_device"
                )}
              ></ha-icon-button>
            `
          : nothing}
      </ha-list-item-base>
    `;
  }

  private _filterDeviceEndpoints(
    deviceEndpoints: DeviceEndpointRowData[]
  ): DeviceEndpointRowData[] {
    const normalizedFilter = this._filter.trim().toLowerCase();

    if (!normalizedFilter) {
      return deviceEndpoints;
    }

    return deviceEndpoints.filter((deviceEndpoint) =>
      [
        deviceEndpoint.name,
        this._deviceEndpointDetails(deviceEndpoint),
        deviceEndpoint.ieee,
        deviceEndpoint.manufacturer,
        deviceEndpoint.model,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedFilter))
    );
  }

  private _deviceEndpointDetails(
    deviceEndpoint: DeviceEndpointRowData
  ): string {
    const entityNames = deviceEndpoint.entities.map(
      (entity) => entity.name || entity.original_name || entity.entity_id
    );
    const entitySummary = entityNames.length
      ? entityNames.length > 2
        ? `${entityNames.slice(0, 2).join(", ")} +${entityNames.length - 2}`
        : entityNames.join(", ")
      : this._i18n.localize("ui.panel.config.zha.groups.no_entities");

    return [
      deviceEndpoint.area,
      `${this._i18n.localize("ui.panel.config.zha.groups.endpoint")} ${
        deviceEndpoint.endpoint_id
      }`,
      entitySummary,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  private _handleFilterChanged(ev: Event): void {
    this._filter = (ev.currentTarget as HTMLInputElement).value;
  }

  private _handleListSelectionChanged(
    ev: CustomEvent<HaListSelectedDetail>
  ): void {
    const list = ev.currentTarget as HaListSelectable;
    let selectedDeviceIds = this._selectedDeviceIds;

    ev.detail.diff?.added.forEach((index) => {
      const item = list.items[index] as HaListItemOption | undefined;
      if (item?.value) {
        selectedDeviceIds = this._setSelectedDeviceId(
          selectedDeviceIds,
          item.value,
          true
        );
      }
    });

    ev.detail.diff?.removed.forEach((index) => {
      const item = list.items[index] as HaListItemOption | undefined;
      if (item?.value) {
        selectedDeviceIds = this._setSelectedDeviceId(
          selectedDeviceIds,
          item.value,
          false
        );
      }
    });

    this._selectedDeviceIds = selectedDeviceIds;
    this._fireSelectionChanged();
  }

  private _setSelectedDeviceId(
    selectedDeviceIds: string[],
    deviceId: string,
    selected: boolean
  ): string[] {
    if (selected) {
      return selectedDeviceIds.includes(deviceId)
        ? selectedDeviceIds
        : [...selectedDeviceIds, deviceId];
    }

    return selectedDeviceIds.filter((selectedDeviceId) => {
      return selectedDeviceId !== deviceId;
    });
  }

  private _fireSelectionChanged(): void {
    this.dispatchEvent(
      new CustomEvent<DeviceEndpointSelectionChangedEvent>(
        "selection-changed",
        {
          detail: { value: this._selectedDeviceIds },
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  private _stopPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-card.scrollable {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        ha-card.searchable.scrollable {
          height: min(520px, calc(100vh - 360px));
        }

        .search {
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        }

        ha-list,
        ha-list-selectable {
          display: block;
          width: 100%;
          background: none;
          padding: 0;
        }

        ha-list-selectable::part(base) {
          width: 100%;
        }

        ha-card.scrollable ha-list,
        ha-card.scrollable ha-list-selectable {
          overflow-y: auto;
        }

        .device-row {
          width: 100%;
          --ha-row-item-min-height: 64px;
          --ha-row-item-gap: var(--ha-space-3);
        }

        [slot="headline"],
        [slot="supporting-text"] {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-list {
          padding: var(--ha-space-6);
          color: var(--secondary-text-color);
          text-align: center;
        }

        @media (max-width: 600px) {
          ha-card.searchable.scrollable {
            height: 440px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-endpoint-list": ZHADeviceEndpointList;
  }
}

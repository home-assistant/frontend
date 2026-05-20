import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/input/ha-input-search";
import type {
  ZHADeviceEndpoint,
  ZHAEntityReference,
} from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

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
  @property({ attribute: false }) public hass!: HomeAssistant;

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

  public clearSelection() {
    this._selectedDeviceIds = [];
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
              <ha-md-list>
                ${deviceEndpoints.map((deviceEndpoint) =>
                  this._renderListRow(deviceEndpoint)
                )}
              </ha-md-list>
            `
          : html`
              <div class="empty-list">
                ${this._filter
                  ? this.hass.localize(
                      "ui.panel.config.zha.groups.no_devices_found"
                    )
                  : this.emptyText ||
                    this.hass.localize("ui.components.data-table.no-data")}
              </div>
            `}
      </ha-card>
    `;
  }

  private get _deviceEndpointRows(): DeviceEndpointRowData[] {
    return this.deviceEndpoints.map((deviceEndpoint) => ({
      name: deviceEndpoint.device.user_given_name || deviceEndpoint.device.name,
      area: deviceEndpoint.device.area_id
        ? this.hass.areas[deviceEndpoint.device.area_id]?.name
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

  private _renderListRow(
    deviceEndpoint: DeviceEndpointRowData
  ): TemplateResult {
    const selected = this._selectedDeviceIds.includes(deviceEndpoint.id);

    return html`
      <ha-md-list-item
        type=${this.selectable ? "button" : "text"}
        class=${selected ? "device-row selected" : "device-row"}
        data-id=${deviceEndpoint.id}
        @click=${this._toggleListRow}
      >
        ${this.selectable
          ? html`
              <ha-checkbox
                slot="start"
                aria-label=${deviceEndpoint.name}
                .checked=${selected}
                .value=${deviceEndpoint.id}
                @click=${this._stopPropagation}
                @change=${this._handleCheckedChanged}
              ></ha-checkbox>
            `
          : nothing}
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
                .label=${this.hass.localize(
                  "ui.panel.config.zha.groups.open_device"
                )}
                @click=${this._stopPropagation}
              ></ha-icon-button>
            `
          : nothing}
      </ha-md-list-item>
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
      : this.hass.localize("ui.panel.config.zha.groups.no_entities");

    return [
      deviceEndpoint.area,
      `${this.hass.localize("ui.panel.config.zha.groups.endpoint")} ${
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

  private _handleCheckedChanged(ev: Event): void {
    const checkbox = ev.currentTarget as HaCheckbox;
    this._selectedDeviceIds = this._setSelectedDeviceId(
      this._selectedDeviceIds,
      checkbox.value!,
      checkbox.checked
    );
    this._fireSelectionChanged();
  }

  private _toggleListRow(ev: Event): void {
    if (!this.selectable) {
      return;
    }

    const deviceId = (ev.currentTarget as HTMLElement).dataset.id!;
    this._selectedDeviceIds = this._setSelectedDeviceId(
      this._selectedDeviceIds,
      deviceId,
      !this._selectedDeviceIds.includes(deviceId)
    );
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

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-card.scrollable ha-md-list {
          overflow-y: auto;
        }

        ha-md-list-item.device-row {
          --md-list-item-two-line-container-height: 64px;
          --ha-md-list-item-gap: var(--ha-space-3);
        }

        ha-md-list-item.device-row.selected {
          background-color: rgba(var(--rgb-primary-color), 0.08);
        }

        ha-checkbox {
          margin-inline-start: var(--ha-space-1);
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

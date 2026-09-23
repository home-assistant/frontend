import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import "../../../../../components/ha-spinner";
import { narrowViewportContext } from "../../../../../data/context";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { zhaDevicePageCardStyles } from "./device-page/zha-device-page-card-styles";

export interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  lqi: number;
  depth: number;
  relationship: string;
}

@customElement("zha-device-neighbors")
class ZHADeviceNeighbors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow!: ContextType<typeof narrowViewportContext>;

  @state() private _devices: Map<string, ZHADevice> | undefined;

  @state() private _loaded = false;

  @state() private _error?: string;

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    const oldDevice = changedProperties.get("device");
    const deviceChanged =
      changedProperties.has("device") && this.device?.ieee !== oldDevice?.ieee;

    if (this.hass && deviceChanged) {
      this._fetchData();
    }
  }

  private _deviceNeighbors = memoizeOne(
    (
      device: ZHADevice | undefined,
      devices: Map<string, ZHADevice> | undefined
    ) => {
      const outputDevices: DeviceRowData[] = [];
      if (device && devices) {
        device.neighbors.forEach((neighbor) => {
          const zhaDevice: ZHADevice | undefined = devices.get(neighbor.ieee);
          outputDevices.push({
            name:
              zhaDevice?.user_given_name || zhaDevice?.name || neighbor.ieee,
            id: zhaDevice?.device_reg_id || neighbor.ieee,
            lqi: Number(neighbor.lqi),
            depth: Number(neighbor.depth),
            relationship: neighbor.relationship,
          });
        });
      }
      return outputDevices;
    }
  );

  private _columns = memoizeOne((narrow: boolean): DataTableColumnContainer =>
    narrow
      ? {
          name: {
            title: this.hass.localize("ui.panel.config.zha.neighbors.name"),
            sortable: true,
            filterable: true,
            direction: "asc",
            flex: 2,
          },
          lqi: {
            title: this.hass.localize("ui.panel.config.zha.neighbors.lqi"),
            sortable: true,
            filterable: true,
            type: "numeric",
          },
        }
      : {
          name: {
            title: this.hass.localize("ui.panel.config.zha.neighbors.name"),
            sortable: true,
            filterable: true,
            direction: "asc",
            flex: 2,
          },
          lqi: {
            title: this.hass.localize("ui.panel.config.zha.neighbors.lqi"),
            sortable: true,
            filterable: true,
            type: "numeric",
          },
          relationship: {
            title: this.hass.localize(
              "ui.panel.config.zha.neighbors.relationship"
            ),
            sortable: true,
            filterable: true,
          },
          depth: {
            title: this.hass.localize("ui.panel.config.zha.neighbors.depth"),
            sortable: true,
            filterable: true,
            type: "numeric",
          },
        }
  );

  protected render(): TemplateResult | typeof nothing {
    if (!this.device) {
      return nothing;
    }

    if (!this._loaded) {
      return html`
        <ha-card class="loading-card">
          <ha-spinner size="large"></ha-spinner>
        </ha-card>
      `;
    }

    if (this._error) {
      return html`<ha-card class="empty-card">${this._error}</ha-card>`;
    }

    const neighbors = this._deviceNeighbors(this.device, this._devices);

    if (!neighbors.length) {
      return html`
        <ha-card class="device-page-card">
          ${this._renderCardHeader()}
          <div class="empty-content">
            ${this.hass.localize("ui.panel.config.zha.neighbors.no_neighbors")}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card class="device-page-card">
        ${this._renderCardHeader()}
        <ha-data-table
          .columns=${this._columns(this._narrow)}
          .data=${neighbors}
          auto-height
          .searchLabel=${this.hass.localize("ui.components.data-table.search")}
          .noDataText=${this.hass.localize(
            "ui.panel.config.zha.neighbors.no_neighbors"
          )}
        ></ha-data-table>
      </ha-card>
    `;
  }

  private _renderCardHeader(): TemplateResult {
    return html`
      <div class="card-header">
        <div class="card-title">
          ${this.hass.localize(
            "ui.panel.config.zha.device_page.tabs.neighbors"
          )}
        </div>
        <div class="card-description">
          ${this.hass.localize(
            "ui.panel.config.zha.device_page.tab_descriptions.neighbors"
          )}
        </div>
      </div>
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this.device && this.hass) {
      const ieee = this.device.ieee;
      this._loaded = false;
      this._error = undefined;
      try {
        const devices = await fetchDevices(this.hass);
        if (this.device?.ieee !== ieee) {
          return;
        }
        this._devices = new Map(
          devices.map((device: ZHADevice) => [device.ieee, device])
        );
      } catch (_err: any) {
        if (this.device?.ieee === ieee) {
          this._error = this.hass.localize(
            "ui.panel.config.zha.neighbors.load_failed"
          );
          this._devices = undefined;
        }
      } finally {
        if (this.device?.ieee === ieee) {
          this._loaded = true;
        }
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      zhaDevicePageCardStyles,
      css`
        ha-data-table {
          --data-table-background-color: var(--card-background-color);
          --data-table-border-width: 0;
          --ha-border-radius-sm: 0;
        }

        .loading-card,
        .empty-card {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8);
        }

        .empty-card {
          color: var(--secondary-text-color);
          text-align: center;
        }

        .empty-content {
          color: var(--secondary-text-color);
          padding: var(--ha-space-8);
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-neighbors": ZHADeviceNeighbors;
  }
}

import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import memoizeOne from "memoize-one";
import { customElement, property, state } from "lit/decorators";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZHADeviceChildrenDialogParams } from "./show-dialog-zha-device-children";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-circular-progress";
import { fetchDevices, ZHADevice } from "../../../../../data/zha";
import { fireEvent } from "../../../../../common/dom/fire_event";

export interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  lqi: number;
}

@customElement("dialog-zha-device-children")
class DialogZHADeviceChildren extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _device: ZHADevice | undefined;

  @state() private _devices: Map<string, ZHADevice> | undefined;

  private _deviceChildren = memoizeOne(
    (
      device: ZHADevice | undefined,
      devices: Map<string, ZHADevice> | undefined
    ) => {
      const outputDevices: DeviceRowData[] = [];
      if (device && devices) {
        device.neighbors.forEach((child) => {
          const zhaDevice: ZHADevice | undefined = devices.get(child.ieee);
          if (zhaDevice) {
            outputDevices.push({
              name: zhaDevice.user_given_name || zhaDevice.name,
              id: zhaDevice.device_reg_id,
              lqi: parseInt(child.lqi),
            });
          }
        });
      }
      return outputDevices;
    }
  );

  private _columns: DataTableColumnContainer = {
    name: {
      title: "Name",
      sortable: true,
      filterable: true,
      direction: "asc",
      grows: true,
    },
    lqi: {
      title: "LQI",
      sortable: true,
      filterable: true,
      type: "numeric",
      width: "75px",
    },
  };

  public showDialog(params: ZHADeviceChildrenDialogParams): void {
    this._device = params.device;
    this._fetchData();
  }

  public closeDialog(): void {
    this._device = undefined;
    this._devices = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._device) {
      return html``;
    }
    return html`
      <ha-dialog
        hideActions
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.dialogs.zha_device_info.device_children`)
        )}
      >
        ${!this._devices
          ? html`<ha-circular-progress
              alt="Loading"
              size="large"
              active
            ></ha-circular-progress>`
          : html`<ha-data-table
              .hass=${this.hass}
              .columns=${this._columns}
              .data=${this._deviceChildren(this._device, this._devices)}
              auto-height
              .dir=${computeRTLDirection(this.hass)}
              .searchLabel=${this.hass.localize(
                "ui.components.data-table.search"
              )}
              .noDataText=${this.hass.localize(
                "ui.components.data-table.no-data"
              )}
            ></ha-data-table>`}
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this._device && this.hass) {
      const devices = await fetchDevices(this.hass!);
      this._devices = new Map(
        devices.map((device: ZHADevice) => [device.ieee, device])
      );
    }
  }

  static get styles(): CSSResultGroup {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-device-children": DialogZHADeviceChildren;
  }
}

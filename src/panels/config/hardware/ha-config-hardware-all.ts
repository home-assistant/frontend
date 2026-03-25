import { dump } from "js-yaml";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type {
  HardwareDevice,
  HassioHardwareInfo,
} from "../../../data/hassio/hardware";
import { fetchHassioHardwareInfo } from "../../../data/hassio/hardware";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import { hardwareTabs } from "./ha-config-hardware";

interface HardwareDeviceRow extends HardwareDevice {
  id: string;
  attributes_string: string;
}

@customElement("ha-config-hardware-all")
class HaConfigHardwareAll extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _hardware?: HassioHardwareInfo;

  @state() private _error?: string;

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<HardwareDeviceRow> => ({
      name: {
        title: localize("ui.panel.config.hardware.available_hardware.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
      },
      dev_path: {
        title: localize(
          "ui.panel.config.hardware.available_hardware.device_path"
        ),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      by_id: {
        title: localize("ui.panel.config.hardware.available_hardware.id"),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      subsystem: {
        title: localize(
          "ui.panel.config.hardware.available_hardware.subsystem"
        ),
        sortable: true,
        filterable: true,
        flex: 1,
      },
      attributes_string: {
        title: "",
        filterable: true,
        hidden: true,
      },
    })
  );

  private _data = memoizeOne(
    (showAdvanced: boolean, hardware: HassioHardwareInfo): DataTableRowData[] =>
      hardware.devices
        .filter(
          (device) =>
            showAdvanced || ["tty", "gpio", "input"].includes(device.subsystem)
        )
        .map((device) => ({
          ...device,
          id: device.dev_path,
          attributes_string: Object.entries(device.attributes)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" "),
        }))
  );

  protected firstUpdated(): void {
    this._load();
  }

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/system"
        .route=${this.route}
        .tabs=${hardwareTabs(this.hass)}
        clickable
        .columns=${this._columns(this.hass.localize)}
        .data=${this._hardware
          ? this._data(
              this.hass.userData?.showAdvanced || false,
              this._hardware
            )
          : []}
        .noDataText=${this._error ||
        this.hass.localize("ui.panel.config.hardware.loading_system_data")}
        @row-click=${this._handleRowClicked}
      ></hass-tabs-subpage-data-table>
    `;
  }

  private async _load() {
    try {
      this._hardware = await fetchHassioHardwareInfo(this.hass);
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private _handleRowClicked(ev: CustomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const device = this._hardware?.devices.find((dev) => dev.dev_path === id);
    if (!device) {
      return;
    }

    showAlertDialog(this, {
      title: device.name,
      subtitle: this.hass.localize(
        "ui.panel.config.hardware.available_hardware.attributes"
      ),
      text: html`${until(this._renderHaCodeEditor(device))}`,
    });
  }

  private async _renderHaCodeEditor(device: HardwareDevice) {
    await import("../../../components/ha-code-editor");

    return html`<ha-code-editor
      mode="yaml"
      .hass=${this.hass}
      .value=${dump(device.attributes, { indent: 2 })}
      read-only
    ></ha-code-editor>`;
  }

  static styles: CSSResultGroup = css`
    ha-code-editor {
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-hardware-all": HaConfigHardwareAll;
  }
}

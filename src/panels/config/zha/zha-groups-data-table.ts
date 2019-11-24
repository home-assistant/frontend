import "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-state-icon";

import memoizeOne from "memoize-one";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HomeAssistant } from "../../../types";
// tslint:disable-next-line
import {
  DataTableColumnContainer,
  RowClickedEvent,
  DataTableRowData,
} from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";

export interface GroupRowData extends DeviceRegistryEntry {
  device?: GroupRowData;
  area?: string;
  integration?: string;
  battery_entity?: string;
}

@customElement("zha-groups-data-table")
export class ZHAGroupsDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Group",
              sortable: true,
              filterable: true,
              direction: "asc",
              template: (name, group: DataTableRowData) => {
                return html`
                  ${name}<br />
                `;
              },
            },
          }
        : {
            name: {
              title: this.hass.localize("ui.panel.config.zha.common.groups"),
              sortable: true,
              filterable: true,
              direction: "asc",
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${[]}
        @row-click=${this._handleRowClicked}
      ></ha-data-table>
    `;
  }

  private _handleRowClicked(ev: CustomEvent) {
    const deviceId = (ev.detail as RowClickedEvent).id;
    navigate(this, `/config/devices/device/${deviceId}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-data-table": ZHAGroupsDataTable;
  }
}

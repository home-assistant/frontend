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
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import { ZHAGroup, ZHADevice } from "../../../data/zha";
import { formatAsPaddedHex } from "./functions";

export interface GroupRowData extends ZHAGroup {
  group?: GroupRowData;
  id?: number;
}

@customElement("zha-groups-data-table")
export class ZHAGroupsDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public groups: ZHAGroup[] = [];
  @property() public selectable = false;

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Group",
              sortable: true,
              filterable: true,
              direction: "asc",
            },
          }
        : {
            name: {
              title: this.hass.localize("ui.panel.config.zha.groups.groups"),
              sortable: true,
              filterable: true,
              direction: "asc",
            },
            group_id: {
              title: this.hass.localize("ui.panel.config.zha.groups.group_id"),
              template: (groupId: number) => {
                return html`
                  ${formatAsPaddedHex(groupId)}
                `;
              },
              sortable: true,
            },
            members: {
              title: this.hass.localize("ui.panel.config.zha.groups.members"),
              template: (members: ZHADevice[]) => {
                return html`
                  ${members.length}
                `;
              },
              sortable: true,
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this.groups}
        .id=${"group_id"}
        .selectable=${this.selectable}
      ></ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-data-table": ZHAGroupsDataTable;
  }
}

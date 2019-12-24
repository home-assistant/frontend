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
import { navigate } from "../../../common/navigate";

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
              template: (name) => html`
                <div @click=${this._handleRowClicked} style="cursor: pointer;">
                  ${name}
                </div>
              `,
            },
          }
        : {
            name: {
              title: this.hass.localize("ui.panel.config.zha.groups.groups"),
              sortable: true,
              filterable: true,
              direction: "asc",
              template: (name) => html`
                <div @click=${this._handleRowClicked} style="cursor: pointer;">
                  ${name}
                </div>
              `,
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

  private _handleRowClicked(ev: CustomEvent) {
    const groupId = (ev.target as HTMLElement)
      .closest("tr")!
      .getAttribute("data-row-id")!;
    navigate(this, `/config/zha/group/${groupId}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-data-table": ZHAGroupsDataTable;
  }
}

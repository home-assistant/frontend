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
import { navigate } from "../../../common/navigate";
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
  @property() public groups!: ZHAGroup[];
  @property() public selectable = false;

  private _groups = memoizeOne((groups: ZHAGroup[]) => {
    let outputGroups: GroupRowData[] = groups;

    outputGroups = outputGroups.map((group) => {
      return {
        ...group,
        name: group.name,
        group_id: group.group_id,
        members: group.members,
        id: group.group_id,
      };
    });

    return outputGroups;
  });

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
              title: this.hass.localize("ui.panel.config.zha.common.groups"),
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
              title: this.hass.localize("ui.panel.config.zha.common.group_id"),
              template: (groupId: number) => {
                return html`
                  ${formatAsPaddedHex(groupId)}
                `;
              },
              sortable: true,
              filterable: true,
              direction: "asc",
            },
            members: {
              title: this.hass.localize("ui.panel.config.zha.common.members"),
              template: (members: ZHADevice[]) => {
                return html`
                  ${members.length}
                `;
              },
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
        .data=${this._groups(this.groups)}
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

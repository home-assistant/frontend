import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  HaDataTable,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/entity/ha-state-icon";
import type { ALDBRecord } from "../../../../../data/insteon";
import type { HomeAssistant } from "../../../../../types";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";

export interface RecordRowData extends ALDBRecord {
  record?: ALDBRecord;
  record_id?: number;
}

@customElement("insteon-aldb-data-table")
export class InsteonALDBDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow = false;

  @property() public records: ALDBRecord[] = [];

  @query("ha-data-table") private _dataTable!: HaDataTable;

  private _records = memoizeOne((records: ALDBRecord[]) => {
    let outputRecords: RecordRowData[] = records;

    outputRecords = outputRecords.map((record) => {
      return {
        ...record,
        record_id: record.mem_addr,
      };
    });

    return outputRecords;
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            in_use: {
              title: "In Use",
              template: (in_use: boolean) => {
                if (in_use) {
                  return html`Y`;
                }
                return html`N`;
              },
              sortable: true,
              width: "22%",
            },
            target: {
              title: "Target",
              sortable: true,
              grows: true,
            },
            group: {
              title: "Group",
              sortable: true,
              width: "22%",
            },
            mode: {
              title: "Mode",
              sortable: true,
              width: "22%",
            },
          }
        : {
            mem_addr: {
              title: "ID",
              sortable: true,
              direction: "desc",
              width: "12%",
            },
            in_use: {
              title: "In Use",
              template: (in_use: boolean) => {
                if (in_use) {
                  return html`Y`;
                }
                return html`N`;
              },
              sortable: true,
              width: "15%",
            },
            target: {
              title: "Target",
              sortable: true,
              width: "15%",
            },
            target_name: {
              title: "Target Device",
              sortable: true,
              grows: true,
            },
            group: {
              title: "Group",
              sortable: true,
              width: "15%",
            },
            mode: {
              title: "Mode",
              sortable: true,
              width: "15%",
            },
          }
  );

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._records(this.records)}
        .id=${"record_id"}
        .dir=${computeRTLDirection(this.hass)}
        .searchLabel=${this.hass.localize("ui.components.data-table.search")}
        noDataText="${this.hass.localize("ui.components.data-table.no-data")}"
      ></ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-aldb-data-table": InsteonALDBDataTable;
  }
}

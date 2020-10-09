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

  @property() public noDataText: string;

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
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.in_use"
              ),
              template: (in_use: boolean) => {
                if (in_use) {
                  return html`Y`;
                }
                return html`N`;
              },
              sortable: true,
              width: "22%",
            },
            dirty: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.modified"
              ),
              template: (dirty: boolean) => {
                if (dirty) {
                  return html`Y`;
                }
                return html`N`;
              },
              sortable: true,
              width: "15%",
            },
            target: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.target"
              ),
              sortable: true,
              grows: true,
            },
            group: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.group"
              ),
              sortable: true,
              width: "22%",
            },
            mode: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.mode"
              ),
              sortable: true,
              width: "22%",
            },
          }
        : {
            mem_addr: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.id"
              ),
              template: (mem_addr: number) => {
                if (mem_addr < 0) {
                  return html`New`;
                }
                return html`${mem_addr}`;
              },
              sortable: true,
              direction: "desc",
              width: "12%",
            },
            in_use: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.in_use"
              ),
              template: (in_use: boolean) => {
                if (in_use) {
                  return html`Y`;
                }
                return html`N`;
              },
              sortable: true,
              width: "12%",
            },
            dirty: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.modified"
              ),
              template: (dirty: boolean) => {
                if (dirty) {
                  return html`Y`;
                }
                return html`N`;
              },
              sortable: true,
              width: "12%",
            },
            target: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.target"
              ),
              sortable: true,
              width: "15%",
            },
            target_name: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.target_device"
              ),
              sortable: true,
              grows: true,
            },
            group: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.group"
              ),
              sortable: true,
              width: "12%",
            },
            mode: {
              title: this.hass.localize(
                "ui.panel.config.insteon.device.aldb.field_names.mode"
              ),
              sortable: true,
              width: "12%",
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
        noDataText="${this.noDataText}"
      ></ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-aldb-data-table": InsteonALDBDataTable;
  }
}

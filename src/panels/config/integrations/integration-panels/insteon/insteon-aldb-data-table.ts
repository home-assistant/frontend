import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  HaDataTable,
} from "../../../../../components/data-table/ha-data-table";
import type { ALDBRecord } from "../../../../../data/insteon";
import type { HomeAssistant } from "../../../../../types";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";

export interface RecordRowData extends ALDBRecord {
  record?: ALDBRecord;
}

@customElement("insteon-aldb-data-table")
export class InsteonALDBDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow = false;

  @property() public records: ALDBRecord[] = [];

  @property() public isLoading = false;

  @property() public showWait = false;

  @query("ha-data-table") private _dataTable!: HaDataTable;

  private _records = memoizeOne((records: ALDBRecord[]) => {
    const outputRecords: RecordRowData[] = records;

    return outputRecords.map((record) => {
      return {
        ...record,
      };
    });
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            in_use: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.in_use"
              ),
              template: (in_use: boolean) => {
                if (in_use) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "22%",
            },
            dirty: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.modified"
              ),
              template: (dirty: boolean) => {
                if (dirty) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "15%",
            },
            target: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.target"
              ),
              sortable: true,
              grows: true,
            },
            group: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.group"
              ),
              sortable: true,
              width: "22%",
            },
            is_controller: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.mode"
              ),
              template: (is_controller: boolean) => {
                if (is_controller) {
                  return html`${this.hass.localize(
                    "ui.panel.config.insteon.aldb.mode.controller"
                  )}`;
                }
                return html`${this.hass.localize(
                  "ui.panel.config.insteon.aldb.mode.responder"
                )}`;
              },
              sortable: true,
              width: "22%",
            },
          }
        : {
            mem_addr: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.id"
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
                "ui.panel.config.insteon.aldb.fields.in_use"
              ),
              template: (in_use: boolean) => {
                if (in_use) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "12%",
            },
            dirty: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.modified"
              ),
              template: (dirty: boolean) => {
                if (dirty) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "12%",
            },
            target: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.target"
              ),
              sortable: true,
              width: "15%",
            },
            target_name: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.target_device"
              ),
              sortable: true,
              grows: true,
            },
            group: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.group"
              ),
              sortable: true,
              width: "12%",
            },
            is_controller: {
              title: this.hass.localize(
                "ui.panel.config.insteon.aldb.fields.mode"
              ),
              template: (is_controller: boolean) => {
                if (is_controller) {
                  return html`${this.hass.localize(
                    "ui.panel.config.insteon.aldb.mode.controller"
                  )}`;
                }
                return html`${this.hass.localize(
                  "ui.panel.config.insteon.aldb.mode.responder"
                )}`;
              },
              sortable: true,
              width: "22%",
            },
          }
  );

  private _noDataText(loading): string {
    if (loading) {
      return "";
    }
    return this.hass!.localize("ui.panel.config.insteon.aldb.no_data");
  }

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    if (this.showWait) {
      return html`
        <ha-circular-progress active alt="Loading"></ha-circular-progress>
      `;
    }
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._records(this.records)}
        .id=${"mem_addr"}
        .dir=${computeRTLDirection(this.hass)}
        .searchLabel=${this.hass.localize("ui.components.data-table.search")}
        .noDataText="${this._noDataText(this.isLoading)}"
      >
        <ha-circular-progress active alt="Loading"></ha-circular-progress>
      </ha-data-table>
      <div>
        ${this.isLoading
          ? html` <div align="center">
              ${this.hass!.localize("ui.panel.config.insteon.aldb.is_loading")}
            </div>`
          : ""}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-aldb-data-table": InsteonALDBDataTable;
  }
}

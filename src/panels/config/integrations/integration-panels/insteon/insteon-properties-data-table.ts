import {
  css,
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
import type { HaDataTable } from "../../../../../components/data-table/ha-data-table";
import type { Property } from "../../../../../data/insteon";
import type { HomeAssistant } from "../../../../../types";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import { Prop } from "vue/types/options";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";

export interface RecordRowData extends Property {
  record?: Property;
}

@customElement("insteon-properties-data-table")
export class InsteonPropertiesDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public records?: Property[] = [];

  @property() public noDataText?: string;

  @property() public showWait = false;

  @query("ha-data-table") private _dataTable!: HaDataTable;

  private _records = memoizeOne((records: Property[]) => {
    const outputRecords: RecordRowData[] = records;

    return outputRecords.map((record) => {
      return {
        ...record,
      };
    });
  });

  private _columns = {
    name: {
      title: "Property",
      sortable: true,
      width: "33%",
    },
    modified: {
      title: "Modified",
      template: (modified: boolean) => {
        if (modified) {
          return html`Y`;
        }
        return html`N`;
      },
      sortable: true,
      width: "33%",
    },
    value: {
      title: "Value",
      sortable: true,
      width: "33%",
    },
  };

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    if (this.showWait) {
      return html`
        <ha-circular-progress
          class="fullwidth"
          active
          alt="Loading"
        ></ha-circular-progress>
      `;
    }
    return html`
      <ha-data-table
        .columns=${this._columns}
        .data=${this._records(this.records!)}
        .id=${"name"}
        .dir=${computeRTLDirection(this.hass)}
        noDataText="${this.noDataText!}"
      ></ha-data-table>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-circular-progress {
        align-items: center;
        justify-content: center;
        padding: 8px;
        box-sizing: border-box;
        width: 100%;
        flex-grow: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-properties-data-table": InsteonPropertiesDataTable;
  }
}

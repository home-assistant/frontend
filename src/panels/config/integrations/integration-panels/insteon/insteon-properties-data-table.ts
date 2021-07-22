import {
  css,
  CSSResult,
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
  HaDataTable,
  DataTableColumnContainer,
} from "../../../../../components/data-table/ha-data-table";
import type { Property } from "../../../../../data/insteon";
import type { HomeAssistant } from "../../../../../types";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";

export interface RecordRowData extends Property {
  record?: Property;
}

@customElement("insteon-properties-data-table")
export class InsteonPropertiesDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow = false;

  @property() public records: Property[] = [];

  @property() public schema: { [key: string]: HaFormSchema } = {};

  @property() public noDataText?: string;

  @property() public showWait = false;

  @query("ha-data-table") private _dataTable!: HaDataTable;

  private _records = memoizeOne((records: Property[]) => {
    const outputRecords: RecordRowData[] = records;

    return outputRecords.map((record) => {
      return {
        description: this._calcDescription(record.name),
        display_value: this._translateValue(record.name, record.value),
        ...record,
      };
    });
  });

  private _calcDescription(prop_name: string) {
    if (prop_name.startsWith("toggle_")) {
      return (
        this.hass.localize(
          "ui.panel.config.insteon.properties.descriptions.button"
        ) +
        " " +
        this._calcButtonName(prop_name) +
        " " +
        this.hass.localize(
          "ui.panel.config.insteon.properties.descriptions.toggle"
        )
      );
    }
    if (prop_name.startsWith("radio_button_group_")) {
      return (
        this.hass.localize(
          "ui.panel.config.insteon.properties.descriptions.radio_button_group"
        ) +
        " " +
        this._calcButtonName(prop_name)
      );
    }
    if (
      prop_name.startsWith("on_mask_") ||
      prop_name.startsWith("off_mask_") ||
      prop_name.startsWith("ramp_rate_") ||
      prop_name.startsWith("on_level_")
    ) {
      return (
        this.hass.localize(
          "ui.panel.config.insteon.properties.descriptions." +
            prop_name.substr(0, prop_name.length - 2)
        ) +
        " " +
        this._calcButtonName(prop_name)
      );
    }
    return this.hass.localize(
      "ui.panel.config.insteon.properties.descriptions." + prop_name
    );
  }

  private _calcButtonName(prop_name: string) {
    if (prop_name.endsWith("main")) {
      return this.hass.localize(
        "ui.panel.config.insteon.properties.descriptions.main"
      );
    }
    return prop_name.substr(-1, 1).toUpperCase();
  }

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.name"
              ),
              sortable: true,
              grows: true,
            },
            modified: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.modified"
              ),
              template: (modified: boolean) => {
                if (modified) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "20%",
            },
            display_value: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.value"
              ),
              sortable: true,
              width: "20%",
            },
          }
        : {
            name: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.name"
              ),
              sortable: true,
              width: "20%",
            },
            description: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.description"
              ),
              sortable: true,
              grows: true,
            },
            modified: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.modified"
              ),
              template: (modified: boolean) => {
                if (modified) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "20%",
            },
            display_value: {
              title: this.hass.localize(
                "ui.panel.config.insteon.properties.fields.value"
              ),
              sortable: true,
              width: "20%",
            },
          }
  );

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
        .columns=${this._columns(this.narrow)}
        .data=${this._records(this.records!)}
        .id=${"name"}
        .dir=${computeRTLDirection(this.hass!)}
        noDataText="${this.noDataText!}"
      ></ha-data-table>
    `;
  }

  private _translateValue(name: string, value: boolean | number | string | []) {
    const schema = this.schema[name];
    if (schema.type === "multi_select") {
      return value.map((item) => schema.options[item]).join(", ");
    }
    if (schema.type === "select") {
      const options_dict = schema.options?.reduce(
        (x, item) => ({ ...x, [item[0]]: item[1] }),
        {}
      );
      return options_dict[value];
    }
    return value;
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

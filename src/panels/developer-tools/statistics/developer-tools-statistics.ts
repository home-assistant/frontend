import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  StatisticsValidationResult,
  validateStatistics,
} from "../../../data/history";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "@material/mwc-button/mwc-button";
import "../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { showFixStatisticsUnitsChangedDialog } from "./show-dialog-statistics-fix-units-changed";

@customElement("developer-tools-statistics")
class HaPanelDevStatistics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _data: (StatisticsValidationResult["data"] & {
    type: string;
  })[] = [];

  protected firstUpdated() {
    this._validateStatistics();
  }

  private _columns: DataTableColumnContainer = {
    statistic_id: {
      title: "Entity",
      sortable: true,
      filterable: true,
      direction: "asc",
      grows: true,
    },
    type: {
      title: "Issue",
      sortable: true,
      filterable: true,
      direction: "asc",
      width: "60%",
      template: (type, data) =>
        html`${this.hass.localize(
          `ui.panel.developer-tools.tabs.statistics.issues.${type}`,
          data
        ) || type}`,
    },
    fix: {
      title: "",
      template: (_, data) =>
        html`<mwc-button @click=${this._fixIssue} .data=${data}
          >Fix issue</mwc-button
        >`,
      width: "113px",
    },
  };

  protected render() {
    return html`
      <ha-data-table
        .columns=${this._columns}
        .data=${this._data}
        noDataText="No issues found!"
      ></ha-data-table>
    `;
  }

  private async _validateStatistics() {
    const issues = Object.values(await validateStatistics(this.hass));
    this._data = [];
    issues.forEach((results) => {
      results.forEach((issue) => {
        this._data?.push({ ...issue.data, type: issue.type });
      });
    });
  }

  private _fixIssue(ev) {
    const issue = ev.currentTarget.data;
    if (issue.type === "unsupported_unit") {
      showAlertDialog(this, {
        title: "Unsupported unit",
        text: html`The unit of your entity is not a suppported unit for the
          device class of the entity, ${issue.device_class}. <br />Statistics
          can not be generated until this entity has a supported unit.
          <br /><br />If this unit was provided by an integration, this is a
          bug. Please report an issue. <br /><br />If you have set this unit
          yourself, and want to have statistics generated, make sure the unit
          matched the device class. The supported units are documented in the
          <a
            href="https://developers.home-assistant.io/docs/core/entity/sensor"
            target="_blank"
          >
            developer documentation</a
          >.`,
      });
      return;
    }
    if (issue.type === "units_changed") {
      showFixStatisticsUnitsChangedDialog(this, issue);
      return;
    }
    showAlertDialog(this, {
      title: "Fix issue",
      text: "Fixing this issue is not supported yet.",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
        }

        th {
          padding: 0 8px;
          text-align: left;
          font-size: var(
            --paper-input-container-shared-input-style_-_font-size
          );
        }

        :host([rtl]) th {
          text-align: right;
        }

        tr {
          vertical-align: top;
          direction: ltr;
        }

        tr:nth-child(odd) {
          background-color: var(--table-row-background-color, #fff);
        }

        tr:nth-child(even) {
          background-color: var(--table-row-alternative-background-color, #eee);
        }
        td {
          padding: 4px;
          min-width: 200px;
          word-break: break-word;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-statistics": HaPanelDevStatistics;
  }
}

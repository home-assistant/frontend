import "@material/mwc-button/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import {
  getStatisticIds,
  StatisticsMetaData,
  StatisticsValidationResult,
  validateStatistics,
} from "../../../data/history";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { showFixStatisticsUnitsChangedDialog } from "./show-dialog-statistics-fix-units-changed";

@customElement("developer-tools-statistics")
class HaPanelDevStatistics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _data: (StatisticsMetaData & {
    issues?: StatisticsValidationResult[];
    state?: HassEntity;
  })[] = [] as StatisticsMetaData[];

  protected firstUpdated() {
    this._validateStatistics();
  }

  private _columns: DataTableColumnContainer = {
    state: {
      title: "Entity",
      sortable: true,
      filterable: true,
      grows: true,
      template: (entityState, data: any) =>
        html`${entityState
          ? computeStateName(entityState)
          : data.statistic_id}`,
    },
    statistic_id: {
      title: "Statistic id",
      sortable: true,
      filterable: true,
      hidden: this.narrow,
      width: "30%",
    },
    unit_of_measurement: {
      title: "Unit",
      sortable: true,
      filterable: true,
      width: "10%",
    },
    issues: {
      title: "Issue",
      sortable: true,
      filterable: true,
      direction: "asc",
      width: "30%",
      template: (issues) =>
        html`${issues
          ? issues.map(
              (issue) =>
                this.hass.localize(
                  `ui.panel.developer-tools.tabs.statistics.issues.${issue.type}`,
                  issue.data
                ) || issue.type
            )
          : ""}`,
    },
    fix: {
      title: "",
      template: (_, data: any) =>
        html`${data.issues
          ? html`<mwc-button @click=${this._fixIssue} .data=${data.issues}
              >Fix issue</mwc-button
            >`
          : ""}`,
      width: "113px",
    },
  };

  protected render() {
    return html`
      <ha-data-table
        .columns=${this._columns}
        .data=${this._data}
        noDataText="No issues found!"
        id="statistic_id"
        clickable
        @row-click=${this._rowClicked}
      ></ha-data-table>
    `;
  }

  private _rowClicked(ev) {
    const id = ev.detail.id;
    if (id in this.hass.states) {
      fireEvent(this, "hass-more-info", { entityId: id });
    }
  }

  private async _validateStatistics() {
    const [statisticIds, issues] = await Promise.all([
      getStatisticIds(this.hass),
      validateStatistics(this.hass),
    ]);

    this._data = statisticIds.map((statistic) => ({
      ...statistic,
      state: this.hass.states[statistic.statistic_id],
      issues: issues[statistic.statistic_id],
    }));
  }

  private _fixIssue(ev) {
    const issue = ev.currentTarget.data[0] as StatisticsValidationResult;
    if (issue.type === "unsupported_unit") {
      showAlertDialog(this, {
        title: "Unsupported unit",
        text: html`The unit of your entity is not a suppported unit for the
          device class of the entity, ${issue.data.device_class}.
          <br />Statistics can not be generated until this entity has a
          supported unit. <br /><br />If this unit was provided by an
          integration, this is a bug. Please report an issue. <br /><br />If you
          have set this unit yourself, and want to have statistics generated,
          make sure the unit matched the device class. The supported units are
          documented in the
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
      showFixStatisticsUnitsChangedDialog(this, {
        issue,
        fixedCallback: () => {
          this._validateStatistics();
        },
      });
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

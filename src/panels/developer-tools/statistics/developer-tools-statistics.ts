import "@material/mwc-button/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
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
import { showFixStatisticsUnsupportedUnitMetadataDialog } from "./show-dialog-statistics-fix-unsupported-unit-meta";

const FIX_ISSUES_ORDER = {
  entity_not_recorded: 1,
  unsupported_unit_state: 2,
  unsupported_state_class: 3,
  units_changed: 4,
  unsupported_unit_metadata: 5,
};
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

  private _columns = memoizeOne(
    (localize): DataTableColumnContainer => ({
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
                  localize(
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
            ? html`<mwc-button @click=${this._fixIssue} .data=${data.issues}>
                Fix issue
              </mwc-button>`
            : ""}`,
        width: "113px",
      },
    })
  );

  protected render() {
    return html`
      <ha-data-table
        .columns=${this._columns(this.hass.localize)}
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

    const statsIds = new Set();

    this._data = statisticIds.map((statistic) => {
      statsIds.add(statistic.statistic_id);
      return {
        ...statistic,
        state: this.hass.states[statistic.statistic_id],
        issues: issues[statistic.statistic_id],
      };
    });

    Object.keys(issues).forEach((statisticId) => {
      if (!statsIds.has(statisticId)) {
        this._data.push({
          statistic_id: statisticId,
          unit_of_measurement: "",
          state: this.hass.states[statisticId],
          issues: issues[statisticId],
        });
      }
    });
  }

  private _fixIssue = (ev) => {
    const issues = (ev.currentTarget.data as StatisticsValidationResult[]).sort(
      (itemA, itemB) =>
        (FIX_ISSUES_ORDER[itemA.type] ?? 99) -
        (FIX_ISSUES_ORDER[itemB.type] ?? 99)
    );
    const issue = issues[0];
    switch (issue.type) {
      case "entity_not_recorded":
        showAlertDialog(this, {
          title: "Entity not recorded",
          text: html`State changes of this entity are not recorded, therefore,
            we can not track long term statistics for it. <br /><br />You
            probably excluded this entity, or have just included some
            entities.<br /><br />See the
            <a
              href="https://www.home-assistant.io/integrations/recorder/#configure-filter"
              target="_blank"
              rel="noreferrer noopener"
            >
              recorder documentation</a
            >
            for more information.`,
        });
        break;
      case "unsupported_state_class":
        showAlertDialog(this, {
          title: "Unsupported state class",
          text: html`The state class of this entity, ${issue.data.state_class}
            is not supported. <br />Statistics can not be generated until this
            entity has a supported state class.<br /><br />If this state class
            was provided by an integration, this is a bug. Please report an
            issue.<br /><br />If you have set this state class yourself, please
            correct it. The different state classes and when to use which can be
            found in the
            <a
              href="https://developers.home-assistant.io/docs/core/entity/sensor/#long-term-statistics"
              target="_blank"
              rel="noreferrer noopener"
            >
              developer documentation</a
            >.`,
        });
        break;
      case "unsupported_unit_metadata":
        showFixStatisticsUnsupportedUnitMetadataDialog(this, {
          issue,
          fixedCallback: () => {
            this._validateStatistics();
          },
        });
        break;
      case "unsupported_unit_state":
        showAlertDialog(this, {
          title: "Unsupported unit",
          text: html`The unit of your entity is not a supported unit for the
            device class of the entity, ${issue.data.device_class}.
            <br />Statistics can not be generated until this entity has a
            supported unit.<br /><br />If this unit was provided by an
            integration, this is a bug. Please report an issue.<br /><br />If
            you have set this unit yourself, and want to have statistics
            generated, make sure the unit matches the device class. The
            supported units are documented in the
            <a
              href="https://developers.home-assistant.io/docs/core/entity/sensor/#available-device-classes"
              target="_blank"
              rel="noreferrer noopener"
            >
              developer documentation</a
            >.`,
        });
        break;
      case "units_changed":
        showFixStatisticsUnitsChangedDialog(this, {
          issue,
          fixedCallback: () => {
            this._validateStatistics();
          },
        });
        break;
      default:
        showAlertDialog(this, {
          title: "Fix issue",
          text: "Fixing this issue is not supported yet.",
        });
    }
  };

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

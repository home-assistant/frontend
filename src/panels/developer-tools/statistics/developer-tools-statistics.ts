import "@material/mwc-button/mwc-button";
import { mdiSlopeUphill } from "@mdi/js";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../common/translations/localize";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import {
  clearStatistics,
  getStatisticIds,
  StatisticsMetaData,
  StatisticsValidationResult,
  validateStatistics,
} from "../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { showStatisticsAdjustSumDialog } from "./show-dialog-statistics-adjust-sum";
import { showFixStatisticsUnitsChangedDialog } from "./show-dialog-statistics-fix-units-changed";
import { documentationUrl } from "../../../util/documentation-url";

const FIX_ISSUES_ORDER = {
  no_state: 0,
  entity_no_longer_recorded: 1,
  entity_not_recorded: 1,
  unsupported_state_class: 2,
  units_changed: 3,
};

type StatisticData = StatisticsMetaData & {
  issues?: StatisticsValidationResult[];
  state?: HassEntity;
};

type DisplayedStatisticData = StatisticData & {
  displayName: string;
  issues_string?: string;
};

@customElement("developer-tools-statistics")
class HaPanelDevStatistics extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _data: StatisticData[] = [] as StatisticsMetaData[];

  private _disabledEntities = new Set<string>();

  private _deletedStatistics = new Set<string>();

  protected firstUpdated() {
    this._validateStatistics();
  }

  private _displayData = memoizeOne(
    (data: StatisticData[], localize: LocalizeFunc): DisplayedStatisticData[] =>
      data.map((item) => ({
        ...item,
        displayName: item.state
          ? computeStateName(item.state)
          : item.name || item.statistic_id,
        issues_string: item.issues
          ?.map(
            (issue) =>
              localize(
                `ui.panel.developer-tools.tabs.statistics.issues.${issue.type}`,
                issue.data
              ) || issue.type
          )
          .join(" "),
      }))
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc
    ): DataTableColumnContainer<DisplayedStatisticData> => ({
      displayName: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.name"
        ),
        sortable: true,
        filterable: true,
        grows: true,
      },
      statistic_id: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.statistic_id"
        ),
        sortable: true,
        filterable: true,
        hidden: this.narrow,
        width: "20%",
      },
      statistics_unit_of_measurement: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.statistics_unit"
        ),
        sortable: true,
        filterable: true,
        width: "10%",
        forceLTR: true,
      },
      source: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.source"
        ),
        sortable: true,
        filterable: true,
        width: "10%",
      },
      issues_string: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.issue"
        ),
        sortable: true,
        filterable: true,
        direction: "asc",
        width: "30%",
        template: (statistic) =>
          html`${statistic.issues_string ??
          localize("ui.panel.developer-tools.tabs.statistics.no_issue")}`,
      },
      fix: {
        title: "",
        label: this.hass.localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.fix"
        ),
        template: (statistic) =>
          html`${statistic.issues
            ? html`<mwc-button
                @click=${this._fixIssue}
                .data=${statistic.issues}
              >
                ${localize(
                  "ui.panel.developer-tools.tabs.statistics.fix_issue.fix"
                )}
              </mwc-button>`
            : "—"}`,
        width: "113px",
      },
      actions: {
        title: "",
        label: localize("ui.panel.developer-tools.tabs.statistics.adjust_sum"),
        type: "icon-button",
        template: (statistic) =>
          statistic.has_sum
            ? html`
                <ha-icon-button
                  .label=${localize(
                    "ui.panel.developer-tools.tabs.statistics.adjust_sum"
                  )}
                  .path=${mdiSlopeUphill}
                  .statistic=${statistic}
                  @click=${this._showStatisticsAdjustSumDialog}
                ></ha-icon-button>
              `
            : "",
      },
    })
  );

  protected render() {
    return html`
      <ha-data-table
        .hass=${this.hass}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._displayData(this._data, this.hass.localize)}
        .noDataText=${this.hass.localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.no_statistics"
        )}
        id="statistic_id"
        clickable
        @row-click=${this._rowClicked}
      ></ha-data-table>
    `;
  }

  private _showStatisticsAdjustSumDialog(ev) {
    ev.stopPropagation();
    showStatisticsAdjustSumDialog(this, {
      statistic: ev.currentTarget.statistic,
    });
  }

  private _rowClicked(ev) {
    const id = ev.detail.id;
    if (id in this.hass.states) {
      fireEvent(this, "hass-more-info", { entityId: id });
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        const disabledEntities = new Set<string>();
        for (const confEnt of entities) {
          if (!confEnt.disabled_by) {
            continue;
          }
          disabledEntities.add(confEnt.entity_id);
        }
        // If the disabled entities changed, re-validate the statistics
        if (disabledEntities !== this._disabledEntities) {
          this._disabledEntities = disabledEntities;
          this._validateStatistics();
        }
      }),
    ];
  }

  private async _validateStatistics() {
    const [statisticIds, issues] = await Promise.all([
      getStatisticIds(this.hass),
      validateStatistics(this.hass),
    ]);

    const statsIds = new Set();

    this._data = statisticIds
      .filter(
        (statistic) =>
          !this._disabledEntities.has(statistic.statistic_id) &&
          !this._deletedStatistics.has(statistic.statistic_id)
      )
      .map((statistic) => {
        statsIds.add(statistic.statistic_id);
        return {
          ...statistic,
          state: this.hass.states[statistic.statistic_id],
          issues: issues[statistic.statistic_id],
        };
      });

    Object.keys(issues).forEach((statisticId) => {
      if (
        !statsIds.has(statisticId) &&
        !this._disabledEntities.has(statisticId) &&
        !this._deletedStatistics.has(statisticId)
      ) {
        this._data.push({
          statistic_id: statisticId,
          statistics_unit_of_measurement: "",
          source: "",
          state: this.hass.states[statisticId],
          issues: issues[statisticId],
          has_mean: false,
          has_sum: false,
          unit_class: null,
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
      case "no_state":
        showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.no_state.title"
          ),
          text: html`${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.no_state.info_text_1"
            )}<br /><br />${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.no_state.info_text_2",
              { statistic_id: issue.data.statistic_id }
            )}`,
          confirmText: this.hass.localize("ui.common.delete"),
          confirm: async () => {
            await clearStatistics(this.hass, [issue.data.statistic_id]);
            this._deletedStatistics.add(issue.data.statistic_id);
            this._validateStatistics();
          },
        });
        break;
      case "entity_not_recorded":
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.title"
          ),
          text: html`${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_1"
            )}<br /><br />${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_2"
            )}<br /><br />
            <a
              href=${documentationUrl(
                this.hass,
                "/integrations/recorder/#configure-filter"
              )}
              target="_blank"
              rel="noreferrer noopener"
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_3_link"
              )}</a
            >`,
        });
        break;
      case "entity_no_longer_recorded":
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.title"
          ),
          text: html`${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_1"
            )}
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_2"
            )}
            <a
              href=${documentationUrl(
                this.hass,
                "/integrations/recorder/#configure-filter"
              )}
              target="_blank"
              rel="noreferrer noopener"
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_3_link"
              )}</a
            >`,
        });
        break;
      case "unsupported_state_class":
        showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.title"
          ),
          text: html`${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_1",
              { state_class: issue.data.state_class }
            )}<br /><br />
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_2"
            )}
            <ul>
              <li>
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_3"
                )}
              </li>
              <li>
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_4"
                )}
                <a
                  href="https://developers.home-assistant.io/docs/core/entity/sensor/#long-term-statistics"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_4_link"
                  )}</a
                >
              </li>
              <li>
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_5"
                )}
              </li>
            </ul>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_6",
              { statistic_id: issue.data.statistic_id }
            )}`,
          confirmText: this.hass.localize("ui.common.delete"),
          confirm: async () => {
            await clearStatistics(this.hass, [issue.data.statistic_id]);
            this._deletedStatistics.add(issue.data.statistic_id);
            this._validateStatistics();
          },
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
          title: this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.no_support.title"
          ),
          text: this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.no_support.info_text_1"
          ),
        });
    }
  };

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-statistics": HaPanelDevStatistics;
  }
}

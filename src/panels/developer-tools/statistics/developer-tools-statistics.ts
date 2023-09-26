import "@material/mwc-button/mwc-button";
import { mdiSlopeUphill } from "@mdi/js";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
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
import { computeRTLDirection } from "../../../common/util/compute_rtl";

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

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _data: StatisticData[] = [] as StatisticsMetaData[];

  private _disabledEntities = new Set<string>();

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
        noDataText="No statistics"
        id="statistic_id"
        clickable
        @row-click=${this._rowClicked}
        .dir=${computeRTLDirection(this.hass)}
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
        (statistic) => !this._disabledEntities.has(statistic.statistic_id)
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
        !this._disabledEntities.has(statisticId)
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
          title: "Entity has no state",
          text: html`This entity has no state at the moment, if this is an
            orphaned entity, you may want to remove the long term statistics of
            it from your database.<br /><br />Do you want to permanently remove
            the long term statistics of ${issue.data.statistic_id} from your
            database?`,
          confirmText: this.hass.localize("ui.common.remove"),
          confirm: async () => {
            await clearStatistics(this.hass, [issue.data.statistic_id]);
            this._validateStatistics();
          },
        });
        break;
      case "entity_not_recorded":
        showAlertDialog(this, {
          title: "Entity not recorded",
          text: html`State changes of this entity are not recorded, therefore,
            we cannot track long term statistics for it. <br /><br />You
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
      case "entity_no_longer_recorded":
        showAlertDialog(this, {
          title: "Entity no longer recorded",
          text: html`We have generated statistics for this entity in the past,
            but state changes of this entity are no longer recorded, therefore,
            we cannot track long term statistics for it anymore. <br /><br />You
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
        showConfirmationDialog(this, {
          title: "Unsupported state class",
          text: html`The state class of this entity, ${issue.data.state_class}
            is not supported. <br />Statistics cannot be generated until this
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
            >. If the state class has permanently changed, you may want to
            remove the long term statistics of it from your database.<br /><br />Do
            you want to permanently remove the long term statistics of
            ${issue.data.statistic_id} from your database?`,
          confirmText: this.hass.localize("ui.common.remove"),
          confirm: async () => {
            await clearStatistics(this.hass, [issue.data.statistic_id]);
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
          padding: max(16px, env(safe-area-inset-top))
            max(16px, env(safe-area-inset-right))
            max(16px, env(safe-area-inset-bottom))
            max(16px, env(safe-area-inset-left));
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

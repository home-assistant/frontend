import type { ContextType } from "@lit/context";
import {
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiCheck,
  mdiClockOutline,
  mdiClose,
  mdiContentCopy,
  mdiArrowLeft,
  mdiArrowRight,
  mdiInformationOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatDate } from "../../../../common/datetime/format_date";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { formatDurationLong } from "../../../../common/datetime/format_duration";
import { formatTime } from "../../../../common/datetime/format_time";
import { consume } from "../../../../common/decorators/consume";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { mainWindow } from "../../../../common/dom/get_main_window";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import { formatNumberWithUnit } from "../../../../common/number/format_number";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/chart/statistics-chart";
import type { StatisticsChart } from "../../../../components/chart/statistics-chart";
import "../../../../components/date-picker/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../../../components/date-picker/ha-date-range-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-selector/ha-selector-number";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import "../../../../components/item/ha-list-item-button";
import type { HaListItemButton } from "../../../../components/item/ha-list-item-button";
import "../../../../components/item/ha-list-item-value";
import "../../../../components/list/ha-grouped-list";
import "../../../../components/list/ha-list-base";
import {
  apiContext,
  configContext,
  internationalizationContext,
  narrowViewportContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type {
  StatisticPeriod,
  Statistics,
  StatisticsMetaData,
  StatisticType,
  StatisticValue,
} from "../../../../data/recorder";
import {
  adjustStatisticsSum,
  clearStatistics,
  fetchStatistics,
  getDisplayUnit,
  StatisticMeanType,
} from "../../../../data/recorder";
import type { NumberSelector } from "../../../../data/selector";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../resources/styles";
import { showToast } from "../../../../util/toast";
import {
  FIXABLE_ISSUES,
  fixStatisticsIssue,
  sortStatisticsIssues,
} from "./fix-statistics";
import type { ValueChangedEvent } from "../../../../types";
import type { DialogStatisticParams } from "./show-dialog-statistic";

// Longer ranges use hourly statistics to keep the preview fast.
const MAX_5MINUTE_PREVIEW_MS = 3 * 24 * 60 * 60 * 1000;

type PreviewPeriod = "5minute" | "hour";

// The recorder also clears the period in which the range starts, so the
// preview starts at the beginning of that period.
const periodStart = (date: Date, period: PreviewPeriod) => {
  const periodMs = (period === "hour" ? 60 : 5) * 60 * 1000;
  return new Date(Math.floor(date.getTime() / periodMs) * periodMs);
};

const HOUR_MS = 60 * 60 * 1000;

const DEFAULT_RANGE_MS = 7 * 24 * HOUR_MS;

const OUTLIER_COUNT = 10;

const LOADER_DELAY = 300;

const SUM_STAT_TYPES: StatisticType[] = ["change"];
const MEAN_STAT_TYPES: StatisticType[] = ["mean", "min", "max"];

const changeSize = (row: StatisticValue) => Math.abs(row.change ?? 0);

const periodKey = (stat: StatisticValue) => `${stat.start}-${stat.end}`;

interface Selection {
  start: number;
  end: number;
}

@customElement("dialog-statistic")
class DialogStatistic extends DialogMixin<DialogStatisticParams>(LitElement) {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow = false;

  @query("statistics-chart") private _chart?: StatisticsChart;

  @state() private _start = new Date();

  @state() private _end = new Date();

  @state() private _statistics?: Statistics;

  @state() private _previewStart?: Date;

  @state() private _previewEnd?: Date;

  @state() private _previewPeriod?: PreviewPeriod;

  @state() private _loading = false;

  @state() private _showLoader = false;

  private _loaderTimeout?: number;

  // First and last time with statistics, null when there are none
  @state() private _bounds?: { first: Date; last: Date } | null;

  @state() private _correcting = false;

  @state() private _idCopied = false;

  private _copyFeedbackTimeout?: number;

  @state() private _selection?: Selection;

  // Hourly periods with the largest values, worst first
  // The whole hourly history, kept to update the outliers after adjusting
  @state() private _outlierHours?: StatisticValue[];

  @state() private _outlierIndex?: number;

  @state() private _outliersLoading = false;

  @state() private _outliersExpanded = false;

  @state() private _amount?: number;

  @state() private _busy = false;

  @state() private _error?: string;

  // Incremented for every fetch, so results of outdated fetches are ignored
  private _fetchId = 0;

  // The recorder adjusts sums in the background, so a fetch right after
  // adjusting can still return the old values.
  private _adjustedChanges = new Map<string, number>();

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this._copyFeedbackTimeout);
    window.clearTimeout(this._loaderTimeout);
  }

  connectedCallback() {
    super.connectedCallback();
    this._end.setMinutes(
      this._end.getMinutes() - (this._end.getMinutes() % 5),
      0,
      0
    );
    this._start = new Date(this._end.getTime() - DEFAULT_RANGE_MS);
    this._fetchStatistics();
    this._fetchBounds(true);
  }

  private get _isSum() {
    return Boolean(this.params!.statistic.has_sum);
  }

  private get _validRange() {
    return this._start.getTime() < this._end.getTime();
  }

  private get _statTypes(): StatisticType[] {
    return this._isSum ? SUM_STAT_TYPES : MEAN_STAT_TYPES;
  }

  // Stable inputs, so a rerender does not rebuild the graph
  private _chartMetadata = memoizeOne((statistic: StatisticsMetaData) => ({
    [statistic.statistic_id]: statistic,
  }));

  private _chartNames = memoizeOne((statisticId: string, name: string) => ({
    [statisticId]: name,
  }));

  private get _unit() {
    return getDisplayUnit(
      this._states,
      this.params!.statistic.statistic_id,
      this.params!.statistic
    );
  }

  private get _rows(): StatisticValue[] {
    return this._statistics?.[this.params!.statistic.statistic_id] ?? [];
  }

  private get _selectedRows(): StatisticValue[] {
    const selection = this._selection;
    if (!selection) {
      return [];
    }
    return this._rows.filter(
      (row) => row.start >= selection.start && row.end <= selection.end
    );
  }

  // Small values get more digits, so they do not round to zero.
  private _fractionDigits(value: number | null | undefined): number {
    const entry =
      this._registries.entities[this.params!.statistic.statistic_id];
    const precision = Math.max(entry?.display_precision ?? 0, 2);
    if (!value || Math.abs(value) >= 10 ** -precision) {
      return precision;
    }
    return Math.min(Math.ceil(-Math.log10(Math.abs(value))) + 1, 20);
  }

  private _round(value: number) {
    const multiple = 10 ** this._fractionDigits(value);
    return Math.round(value * multiple) / multiple;
  }

  private _formatValue(value: number) {
    return formatNumberWithUnit(value, this._unit, this._i18n.locale, {
      maximumFractionDigits: this._fractionDigits(value),
    });
  }

  private _formatDate(date: Date | number) {
    return formatDateTime(
      new Date(date),
      this._i18n.locale,
      this._config.config
    );
  }

  private _formatPeriod(start: number, end: number) {
    const locale = this._i18n.locale;
    const config = this._config.config;
    // A period ending at midnight still belongs to the day it starts on
    const sameDay =
      formatDate(new Date(start), locale, config) ===
      formatDate(new Date(end - 1), locale, config);
    return this._i18n.localize(
      "ui.panel.config.tools.tabs.statistics.statistic.period",
      {
        start: this._formatDate(start),
        end: sameDay
          ? formatTime(new Date(end), locale, config)
          : this._formatDate(end),
      }
    );
  }

  private _formatDuration(ms: number) {
    const minutes = Math.round(ms / 60000);
    return formatDurationLong(this._i18n.locale, {
      days: Math.floor(minutes / 1440) || undefined,
      hours: Math.floor((minutes % 1440) / 60) || undefined,
      minutes: minutes % 60 || undefined,
    });
  }

  private _allDataRange = memoizeOne(
    (
      bounds: { first: Date; last: Date } | null | undefined,
      localize: LocalizeFunc
    ): DateRangePickerRanges | undefined =>
      bounds
        ? {
            [localize(
              "ui.panel.config.tools.tabs.statistics.statistic.all_data"
            )]: [bounds.first, bounds.last],
          }
        : undefined
  );

  private _amountSelector = memoizeOne(
    (unit: string | undefined, digits: number): NumberSelector => ({
      number: {
        step: 10 ** -digits,
        unit_of_measurement: unit,
        mode: "box",
      },
    })
  );

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const statistic = this.params.statistic;
    const statisticId = statistic.statistic_id;
    const hasData = this._rows.length > 0;
    const breadcrumb = [
      this.params.area,
      this.params.device !== this.params.name ? this.params.device : undefined,
    ].filter((part): part is string => Boolean(part));

    return html`
      <ha-dialog
        open
        width="large"
        .accessibleLabel=${this.params.name}
        .headerSubtitle=${
          !breadcrumb.length && this.params.name !== statisticId
            ? statisticId
            : undefined
        }
        .preventScrimClose=${this._busy || this._correcting}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          .label=${localize("ui.common.close")}
          .path=${mdiClose}
          .disabled=${this._busy}
          @click=${this.closeDialog}
        ></ha-icon-button>
        <span slot="headerTitle" class="title">
          ${
            breadcrumb.length
              ? html`<span class="breadcrumb">
                  ${breadcrumb.join(
                    mainWindow.document.dir === "rtl" ? " ◂ " : " ▸ "
                  )}
                </span>`
              : nothing
          }
          <span class="main">${this.params.name}</span>
        </span>
        ${
          statisticId in this._states
            ? html`<ha-icon-button
                slot="headerActionItems"
                .label=${localize(
                  "ui.panel.config.tools.tabs.statistics.statistic.more_info"
                )}
                .path=${mdiInformationOutline}
                @click=${this._showMoreInfo}
              ></ha-icon-button>`
            : nothing
        }
        ${
          this._correcting
            ? html`<ha-alert
                alert-type="info"
                .title=${localize(
                  "ui.panel.config.tools.tabs.statistics.statistic.correct_mode"
                )}
                .narrow=${this._narrow}
              >
                ${localize(
                  this._isSum
                    ? "ui.panel.config.tools.tabs.statistics.statistic.correct_sum_hint"
                    : "ui.panel.config.tools.tabs.statistics.statistic.correct_mean_hint"
                )}
                <ha-button
                  slot="action"
                  appearance="plain"
                  size="s"
                  .disabled=${this._busy}
                  @click=${this._stopCorrecting}
                >
                  ${localize("ui.common.leave")}
                </ha-button>
              </ha-alert>`
            : this._renderIssues()
        }
        <div class="range">
          <ha-date-range-picker
            time-picker
            extended-presets
            .startDate=${this._start}
            .endDate=${this._end}
            .extraRanges=${this._allDataRange(this._bounds, localize)}
            .disabled=${this._busy}
            @value-changed=${this._rangeChanged}
          ></ha-date-range-picker>
          ${
            this._showLoader && this._statistics
              ? html`<ha-spinner size="small"></ha-spinner>`
              : nothing
          }
        </div>

        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          !this._validRange
            ? html`<ha-alert alert-type="error">
                ${localize(
                  "ui.panel.config.tools.tabs.statistics.statistic.invalid_range"
                )}
              </ha-alert>`
            : !this._statistics
              ? html`<div class="preview center">
                  <ha-spinner></ha-spinner>
                </div>`
              : !hasData
                ? html`<div class="preview center">
                    ${localize(
                      "ui.panel.config.tools.tabs.statistics.statistic.no_statistics_found"
                    )}
                  </div>`
                : html`<div class="preview">
                      <statistics-chart
                        .statisticsData=${this._statistics}
                        .metadata=${this._chartMetadata(statistic)}
                        .names=${this._chartNames(statisticId, this.params.name)}
                        .statTypes=${this._statTypes}
                        .chartType=${this._isSum ? "bar" : "line"}
                        .startTime=${this._previewStart}
                        .endTime=${this._previewEnd}
                        .period=${this._previewPeriod}
                        .selectRange=${this._correcting && !this._isSum}
                        .highlight=${this._selection}
                        hide-legend
                        zoom-slider="always"
                        .clickForMoreInfo=${false}
                        height="300px"
                        @chart-grid-click=${this._chartClicked}
                        @chart-range-select=${this._chartRangeSelected}
                      ></statistics-chart>
                    </div>
                    ${this._correcting ? this._renderSelection() : nothing}`
        }
        ${this._correcting ? this._renderOutliers() : this._renderDetails()}
        ${
          this._correcting
            ? nothing
            : html`<ha-dialog-footer slot="footer">
                ${this._renderViewActions(hasData)}
              </ha-dialog-footer>`
        }
      </ha-dialog>
    `;
  }

  private _outliers = memoizeOne(
    (hours: StatisticValue[] | undefined): StatisticValue[] | undefined =>
      hours &&
      [...hours]
        .sort((a, b) => changeSize(b) - changeSize(a))
        .slice(0, OUTLIER_COUNT)
  );

  // Only for sums: the hours with the largest changes, worst first
  private _renderOutliers() {
    if (!this._isSum || !this._bounds) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const outliers = this._outliers(this._outlierHours);
    return html`<ha-expansion-panel
      outlined
      .expanded=${this._outliersExpanded}
      @expanded-changed=${this._outliersExpandedChanged}
      .header=${localize(
        "ui.panel.config.tools.tabs.statistics.statistic.outliers"
      )}
    >
      ${
        !outliers
          ? html`<div class="list-placeholder">
              <ha-spinner size="small"></ha-spinner>
            </div>`
          : !outliers.length
            ? html`<div class="list-placeholder">
                ${localize(
                  "ui.panel.config.tools.tabs.statistics.statistic.no_outliers"
                )}
              </div>`
            : html`<ha-list-base class="outlier-list">
                ${outliers.map(
                  (row, index) =>
                    html`<ha-list-item-button
                      data-index=${index}
                      .disabled=${this._busy}
                      @click=${this._outlierClicked}
                    >
                      <div class="detail-row" slot="content">
                        <div
                          class=${
                            index === this._outlierIndex
                              ? "label current"
                              : "label"
                          }
                        >
                          ${this._formatPeriod(row.start, row.end)}
                        </div>
                        <div class="value">
                          ${this._formatValue(row.change ?? 0)}
                        </div>
                      </div>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>`
                )}
              </ha-list-base>`
      }
    </ha-expansion-panel>`;
  }

  // The whole hourly history is only read once the list is opened
  private _outliersExpandedChanged(
    ev: HASSDomEvent<HASSDomEvents["expanded-changed"]>
  ) {
    this._outliersExpanded = ev.detail.expanded;
    if (
      this._outliersExpanded &&
      this._outlierHours === undefined &&
      !this._outliersLoading
    ) {
      this._loadOutliers();
    }
  }

  private _outlierClicked(ev: HASSDomCurrentTargetEvent<HaListItemButton>) {
    this._showOutlier(Number(ev.currentTarget.dataset.index));
  }

  private async _loadOutliers() {
    const bounds = this._bounds!;
    const statisticId = this.params!.statistic.statistic_id;
    this._outliersLoading = true;
    try {
      const rows =
        (
          await fetchStatistics(
            this._api.callWS,
            bounds.first,
            bounds.last,
            [statisticId],
            "hour",
            undefined,
            this._statTypes
          )
        )[statisticId] ?? [];
      this._outlierHours = rows;
    } catch (err: any) {
      this._outlierHours = [];
      this._error = err.message || err;
    } finally {
      this._outliersLoading = false;
    }
  }

  private async _showOutlier(index: number) {
    const hour = this._outliers(this._outlierHours)?.[index];
    if (!hour) {
      return;
    }
    this._outlierIndex = index;
    // As wide as the graph can go while it still shows 5 minute periods
    const middle = (hour.start + hour.end) / 2;
    let fetchId = await this._setRange(
      new Date(middle - MAX_5MINUTE_PREVIEW_MS / 2),
      new Date(middle + MAX_5MINUTE_PREVIEW_MS / 2)
    );
    const hourRows = () =>
      this._rows.filter(
        (row) => row.start >= hour.start && row.end <= hour.end
      );
    // Five minute periods of that hour can be purged while newer ones remain,
    // a slightly wider range shows hours instead
    if (fetchId === this._fetchId && !hourRows().length) {
      fetchId = await this._setRange(
        new Date(middle - MAX_5MINUTE_PREVIEW_MS / 2 - HOUR_MS),
        new Date(middle + MAX_5MINUTE_PREVIEW_MS / 2 + HOUR_MS)
      );
    }
    if (fetchId !== this._fetchId) {
      return;
    }
    // The graph can show 5 minute periods, select the largest one in that hour
    const rows = hourRows();
    if (!rows.length) {
      return;
    }
    this._select(
      rows.reduce((result, row) =>
        changeSize(row) > changeSize(result) ? row : result
      )
    );
  }

  private _renderDetails() {
    const localize = this._i18n.localize;
    const statistic = this.params!.statistic;
    const bounds = this._bounds;
    const idLabel = localize(
      "ui.panel.config.tools.tabs.statistics.data_table.statistic_id"
    );
    return html`<ha-grouped-list
      .header=${localize("ui.dialogs.more_info_control.details")}
    >
      <ha-list-item-button
        aria-label=${localize("ui.dialogs.more_info_control.copy_value", {
          label: idLabel,
          value: statistic.statistic_id,
        })}
        @click=${this._copyStatisticId}
      >
        <div class="detail-row" slot="content">
          <div class="label">${idLabel}</div>
          <div class="value code">${statistic.statistic_id}</div>
        </div>
        <ha-svg-icon
          class=${this._idCopied ? "copy-success" : ""}
          slot="end"
          .path=${this._idCopied ? mdiCheck : mdiContentCopy}
        ></ha-svg-icon>
      </ha-list-item-button>
      ${
        bounds
          ? html`<ha-list-item-button
              aria-label=${localize(
                "ui.panel.config.tools.tabs.statistics.statistic.show_all_data"
              )}
              .disabled=${this._busy}
              @click=${this._showAllData}
            >
              <div class="detail-row" slot="content">
                <div class="label">
                  ${localize(
                    "ui.panel.config.tools.tabs.statistics.statistic.data_range"
                  )}
                </div>
                <div class="value">
                  ${this._formatPeriod(
                    bounds.first.getTime(),
                    bounds.last.getTime()
                  )}
                </div>
              </div>
              <ha-svg-icon
                slot="end"
                .path=${mdiArrowExpandHorizontal}
              ></ha-svg-icon>
            </ha-list-item-button>`
          : nothing
      }
      ${
        statistic.statistics_unit_of_measurement
          ? html`<ha-list-item-value
              .label=${localize(
                "ui.panel.config.tools.tabs.statistics.data_table.statistics_unit"
              )}
            >
              ${statistic.statistics_unit_of_measurement}
            </ha-list-item-value>`
          : nothing
      }
      <ha-list-item-value
        .label=${localize(
          "ui.panel.config.tools.tabs.statistics.data_table.source"
        )}
      >
        ${statistic.source}
      </ha-list-item-value>
    </ha-grouped-list>`;
  }

  private async _copyStatisticId() {
    await copyToClipboard(this.params!.statistic.statistic_id);
    const duration = 4000;
    this._idCopied = true;
    window.clearTimeout(this._copyFeedbackTimeout);
    this._copyFeedbackTimeout = window.setTimeout(() => {
      this._idCopied = false;
    }, duration);
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
      duration,
    });
  }

  private _renderIssues() {
    const issues = this.params!.issues;
    if (!issues?.length) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const fixable = issues.some((issue) => FIXABLE_ISSUES.includes(issue.type));
    return html`<ha-alert alert-type="warning" .narrow=${this._narrow}>
      ${issues
        .map(
          (issue) =>
            localize(
              `ui.panel.config.tools.tabs.statistics.issues.${issue.type}`,
              issue.data
            ) || issue.type
        )
        .join(" ")}
      <ha-button
        slot="action"
        variant="warning"
        size="s"
        .disabled=${this._busy}
        @click=${this._fixIssue}
      >
        ${localize(
          fixable
            ? "ui.panel.config.tools.tabs.statistics.fix_issue.fix"
            : "ui.panel.config.tools.tabs.statistics.fix_issue.info"
        )}
      </ha-button>
    </ha-alert>`;
  }

  private _renderViewActions(hasData: boolean) {
    return html`<ha-button
      slot="primaryAction"
      appearance="plain"
      .disabled=${!hasData}
      @click=${this._startCorrecting}
    >
      ${this._i18n.localize(
        "ui.panel.config.tools.tabs.statistics.statistic.correct"
      )}
    </ha-button>`;
  }

  private _renderCorrectAction() {
    const localize = this._i18n.localize;
    return this._isSum
      ? html`<ha-button
          .loading=${this._busy}
          .disabled=${this._busy || !this._amountChanged}
          @click=${this._adjust}
        >
          ${localize("ui.panel.config.tools.tabs.statistics.statistic.adjust")}
        </ha-button>`
      : html`<ha-button
          variant="danger"
          .loading=${this._busy}
          .disabled=${this._busy || !this._selectedRows.length}
          @click=${this._delete}
        >
          ${localize("ui.panel.config.tools.tabs.statistics.statistic.delete")}
        </ha-button>`;
  }

  // Same layout with or without a selection, so nothing moves on select
  private _renderSelection() {
    const selection = this._selection;
    const rows = this._selectedRows;
    const selected = Boolean(selection && rows.length);
    const localize = this._i18n.localize;
    return html`
      <div class="selection">
        <div class="selection-header">
          <ha-svg-icon .path=${mdiClockOutline}></ha-svg-icon>
          <span class=${selected ? "period" : "period empty"}>
            ${
              selected
                ? this._formatPeriod(selection!.start, selection!.end)
                : localize(
                    "ui.panel.config.tools.tabs.statistics.statistic.no_selection"
                  )
            }
          </span>
          ${
            selected
              ? html`<span class="duration">
                  ${this._formatDuration(selection!.end - selection!.start)}
                </span>`
              : nothing
          }
        </div>
        <div
          class=${this._narrow ? "selection-content narrow" : "selection-content"}
        >
          ${
            this._isSum
              ? html`${this._renderValue(
                    localize(
                      "ui.panel.config.tools.tabs.statistics.statistic.current_value"
                    ),
                    selected ? (rows[0].change ?? 0) : undefined
                  )}
                  <ha-svg-icon
                    class="arrow"
                    .path=${
                      this._narrow
                        ? mdiArrowDown
                        : mainWindow.document.dir === "rtl"
                          ? mdiArrowLeft
                          : mdiArrowRight
                    }
                  ></ha-svg-icon>
                  <ha-selector-number
                    .label=${localize(
                      "ui.panel.config.tools.tabs.statistics.statistic.new_value"
                    )}
                    .selector=${this._amountSelector(
                      this._unit || undefined,
                      this._fractionDigits(selected ? rows[0].change : 0)
                    )}
                    .value=${this._amount}
                    .disabled=${this._busy || !selected}
                    @value-changed=${this._amountValueChanged}
                  ></ha-selector-number>`
              : this._renderMeanValues(selected ? rows : [])
          }
          ${this._renderCorrectAction()}
        </div>
      </div>
    `;
  }

  private _renderValue(label: string, value?: number) {
    return html`<div class="value">
      <span class="label">${label}</span>
      <span class="number">
        ${value === undefined ? "—" : this._formatValue(value)}
      </span>
    </div>`;
  }

  private _renderMeanValues(rows: StatisticValue[]) {
    const localize = this._i18n.localize;
    const values = (type: "mean" | "min" | "max") =>
      rows
        .map((row) => row[type])
        .filter((value): value is number => value != null);
    const means = values("mean");
    const mins = values("min");
    const maxes = values("max");
    return html`<div class="values">
      ${this._renderValue(
        localize("ui.panel.config.tools.tabs.statistics.statistic.mean"),
        // An average of angles needs a circular mean, which the rows do not allow
        means.length === 1 ||
          (means.length &&
            this.params!.statistic.mean_type !== StatisticMeanType.CIRCULAR)
          ? means.reduce((total, value) => total + value, 0) / means.length
          : undefined
      )}
      ${this._renderValue(
        localize("ui.panel.config.tools.tabs.statistics.statistic.min"),
        mins.length ? Math.min(...mins) : undefined
      )}
      ${this._renderValue(
        localize("ui.panel.config.tools.tabs.statistics.statistic.max"),
        maxes.length ? Math.max(...maxes) : undefined
      )}
    </div>`;
  }

  private get _amountChanged() {
    const row = this._selectedRows[0];
    return (
      row !== undefined &&
      this._amount !== undefined &&
      this._amount !== this._round(row.change ?? 0)
    );
  }

  private _showMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this.params!.statistic.statistic_id,
    });
  }

  private async _fixIssue() {
    const params = this.params!;
    const [issue] = sortStatisticsIssues(params.issues!);
    const fixed = await fixStatisticsIssue(this, issue);
    if (fixed) {
      params.issueFixedCallback?.();
      this.closeDialog();
    }
  }

  private _startCorrecting() {
    this._correcting = true;
  }

  private _stopCorrecting() {
    this._correcting = false;
    this._outlierIndex = undefined;
    this._select(undefined);
  }

  private _select(row: StatisticValue | undefined, end = row?.end) {
    this._selection = row ? { start: row.start, end: end! } : undefined;
    this._amount =
      row && this._isSum ? this._round(row.change ?? 0) : undefined;
  }

  private _chartClicked(ev: HASSDomEvent<HASSDomEvents["chart-grid-click"]>) {
    if (!this._correcting || this._busy || this._loading) {
      return;
    }
    const time = ev.detail.x;
    const row = this._rows.find(
      (stat) => stat.start <= time && time < stat.end
    );
    if (row) {
      this._select(row);
    }
  }

  private _chartRangeSelected(
    ev: HASSDomEvent<HASSDomEvents["chart-range-select"]>
  ) {
    if (!this._correcting || this._busy || this._loading) {
      return;
    }
    const { start, end } = ev.detail;
    const rows = this._rows.filter((row) => row.end > start && row.start < end);
    if (!rows.length) {
      return;
    }
    this._select(rows[0], rows[rows.length - 1].end);
  }

  private _amountValueChanged(ev: ValueChangedEvent<number | undefined>) {
    this._amount = ev.detail.value;
  }

  private _showAllData() {
    this._setRange(this._bounds!.first, this._bounds!.last);
  }

  private _rangeChanged(
    ev: ValueChangedEvent<{ startDate: Date; endDate: Date }>
  ) {
    this._setRange(ev.detail.value.startDate, ev.detail.value.endDate);
  }

  // A zoom kept from the previous range could hide the new one
  private _setRange(start: Date, end: Date) {
    this._start = start;
    this._end = end;
    this._chart?.resetZoom();
    return this._fetchStatistics();
  }

  // Quick loads show no loader, so it does not flash
  private _setLoading(loading: boolean) {
    this._loading = loading;
    window.clearTimeout(this._loaderTimeout);
    if (!loading) {
      this._showLoader = false;
      return;
    }
    this._loaderTimeout = window.setTimeout(() => {
      this._showLoader = true;
    }, LOADER_DELAY);
  }

  // The current graph stays until the new data arrives, so nothing flickers
  private async _fetchStatistics(): Promise<number> {
    const fetchId = ++this._fetchId;
    this._error = undefined;
    if (!this._validRange) {
      this._select(undefined);
      this._setLoading(false);
      return fetchId;
    }
    this._setLoading(true);
    const statisticId = this.params!.statistic.statistic_id;
    const fetchPreview = async (period: PreviewPeriod) => {
      const start = periodStart(this._start, period);
      const statistics = await fetchStatistics(
        this._api.callWS,
        start,
        this._end,
        [statisticId],
        period,
        undefined,
        this._statTypes
      );
      return { start, period, statistics };
    };
    try {
      const shortRange =
        this._end.getTime() - this._start.getTime() <= MAX_5MINUTE_PREVIEW_MS;
      let preview = await fetchPreview(shortRange ? "5minute" : "hour");
      // Short term statistics are purged before the hourly statistics.
      if (shortRange && !preview.statistics[statisticId]?.length) {
        preview = await fetchPreview("hour");
      }
      if (fetchId === this._fetchId) {
        this._select(undefined);
        this._previewStart = preview.start;
        this._previewEnd = this._end;
        this._previewPeriod = preview.period;
        this._statistics = this._applyAdjustedChanges(preview.statistics);
      }
    } catch (err: any) {
      if (fetchId === this._fetchId) {
        this._statistics = {};
        this._error = err.message || err;
      }
    }
    if (fetchId === this._fetchId) {
      this._setLoading(false);
    }
    return fetchId;
  }

  private async _fetchBounds(moveToLastData = false) {
    const statisticId = this.params!.statistic.statistic_id;
    const types = this._statTypes;
    const fetchRows = async (
      start: Date,
      end: Date | undefined,
      period: StatisticPeriod
    ) =>
      (
        await fetchStatistics(
          this._api.callWS,
          start,
          end,
          [statisticId],
          period,
          undefined,
          types
        )
      )[statisticId] ?? [];
    try {
      const months = await fetchRows(new Date(0), undefined, "month");
      if (!months.length) {
        this._bounds = null;
        return;
      }
      const firstMonth = months[0];
      const lastMonth = months[months.length - 1];
      const [firstRows, lastRows] = await Promise.all([
        fetchRows(new Date(firstMonth.start), new Date(firstMonth.end), "hour"),
        fetchRows(new Date(lastMonth.start), new Date(lastMonth.end), "hour"),
      ]);
      if (!firstRows.length || !lastRows.length) {
        this._bounds = null;
        return;
      }
      this._bounds = {
        first: new Date(firstRows[0].start),
        last: new Date(lastRows[lastRows.length - 1].end),
      };
    } catch (_err: unknown) {
      this._bounds = null;
      return;
    }
    // Statistics of removed entities can stop long before the default range
    if (moveToLastData && this._bounds.last < this._start) {
      this._setRange(
        new Date(this._bounds.last.getTime() - DEFAULT_RANGE_MS),
        this._bounds.last
      );
    }
  }

  private _applyAdjustedChanges(statistics: Statistics): Statistics {
    if (!this._adjustedChanges.size) {
      return statistics;
    }
    const statisticId = this.params!.statistic.statistic_id;
    const rows = statistics[statisticId];
    if (!rows) {
      return statistics;
    }
    return {
      ...statistics,
      [statisticId]: rows.map((row) => {
        const change = this._adjustedChanges.get(periodKey(row));
        return change === undefined ? row : { ...row, change };
      }),
    };
  }

  private async _adjust() {
    const row = this._selectedRows[0];
    const amount = this._amount!;
    this._busy = true;
    this._error = undefined;
    try {
      await adjustStatisticsSum(
        this._api,
        this.params!.statistic.statistic_id,
        row.start,
        // The shown value is rounded, so compare with the stored value.
        amount - (row.change ?? 0),
        this._unit || null
      );
    } catch (err: any) {
      this._error = err.message || err;
      return;
    } finally {
      this._busy = false;
    }
    showToast(this, {
      message: this._i18n.localize(
        "ui.panel.config.tools.tabs.statistics.statistic.adjusted"
      ),
    });
    // A cached period that overlaps this one at another resolution is stale now
    for (const key of [...this._adjustedChanges.keys()]) {
      const [start, end] = key.split("-").map(Number);
      if (start < row.end && end > row.start) {
        this._adjustedChanges.delete(key);
      }
    }
    this._adjustedChanges.set(periodKey(row), amount);
    if (this._statistics) {
      this._statistics = this._applyAdjustedChanges(this._statistics);
    }
    // The recorder adjusts the hour that holds the period too
    const adjustment = amount - (row.change ?? 0);
    this._outlierHours = this._outlierHours?.map((hour) =>
      hour.start <= row.start && row.end <= hour.end
        ? { ...hour, change: (hour.change ?? 0) + adjustment }
        : hour
    );
    this._outlierIndex = undefined;
    this._select(
      this._rows.find(
        (updated) => updated.start === row.start && updated.end === row.end
      )
    );
  }

  private async _delete() {
    const localize = this._i18n.localize;
    const selection = this._selection!;
    const confirmed = await showConfirmationDialog(this, {
      title: localize(
        "ui.panel.config.tools.tabs.statistics.statistic.delete_confirm_title"
      ),
      text: html`${this._formatPeriod(selection.start, selection.end)}<br /><br />${localize(
          this._previewPeriod === "5minute"
            ? "ui.panel.config.tools.tabs.statistics.statistic.delete_confirm_text_5minute"
            : "ui.panel.config.tools.tabs.statistics.statistic.delete_confirm_text"
        )}`,
      confirmText: localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    this._busy = true;
    this._error = undefined;
    try {
      await clearStatistics(this._api, [this.params!.statistic.statistic_id], {
        start: new Date(selection.start),
        end: new Date(selection.end),
      });
    } catch (err: any) {
      this._error = err.message || err;
      return;
    } finally {
      this._busy = false;
    }
    showToast(this, {
      message: localize(
        "ui.panel.config.tools.tabs.statistics.statistic.deleted"
      ),
    });
    this._outlierHours = undefined;
    this._outlierIndex = undefined;
    this._fetchStatistics();
    this._fetchBounds();
    if (this._outliersExpanded) {
      this._loadOutliers();
    }
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --ha-dialog-header-title-height: auto;
      }
      .title {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .title span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      ha-grouped-list {
        display: block;
        margin-top: var(--ha-space-6);
      }
      ha-list-item-button {
        --ha-row-item-padding-block: var(--ha-space-2);
        --ha-row-item-min-height: 40px;
        --ha-row-item-gap: var(--ha-space-3);
        --mdc-icon-size: 20px;
      }
      .detail-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3);
      }
      .detail-row .label {
        flex: 1;
        color: var(--secondary-text-color);
      }
      .detail-row .value {
        max-width: 60%;
        min-width: 0;
        text-align: end;
        overflow-wrap: anywhere;
      }
      .detail-row .value.code {
        font-family: var(--ha-font-family-code);
      }
      ha-svg-icon.copy-success {
        color: var(--success-color);
      }
      .breadcrumb {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-m);
      }
      ha-alert {
        display: block;
        margin-bottom: var(--ha-space-4);
      }
      ha-alert ha-button[slot="action"] {
        width: max-content;
        white-space: nowrap;
      }
      ha-expansion-panel {
        display: block;
        margin-top: var(--ha-space-4);
        --expansion-panel-content-padding: 0;
      }
      .outlier-list {
        display: block;
      }
      .list-placeholder {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-3) var(--ha-space-4);
        color: var(--secondary-text-color);
      }
      .detail-row .label.current {
        color: var(--primary-text-color);
        font-weight: var(--ha-font-weight-medium);
      }
      .range {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ha-space-2);
        margin-bottom: var(--ha-space-4);
      }
      .preview {
        min-height: 300px;
      }
      .center {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
      }
      .selection {
        margin-top: var(--ha-space-4);
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
      }
      .selection-header {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        padding: var(--ha-space-3) var(--ha-space-4);
        border-bottom: 1px solid var(--divider-color);
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
      }
      .period {
        flex: 1;
        min-width: 0;
        color: var(--primary-text-color);
        font-weight: var(--ha-font-weight-medium);
      }
      .period.empty {
        color: var(--secondary-text-color);
        font-weight: var(--ha-font-weight-normal);
      }
      .duration {
        font-size: var(--ha-font-size-s);
      }
      .selection-content {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
        padding: var(--ha-space-4);
      }
      .selection-content > .value,
      .selection-content > ha-selector-number,
      .selection-content > .values {
        flex: 1;
        min-width: 0;
      }
      .selection-content.narrow {
        flex-direction: column;
        align-items: stretch;
      }
      .selection-content.narrow > .arrow {
        align-self: center;
      }
      .selection-content.narrow > ha-button {
        align-self: flex-end;
      }
      ha-selector-number {
        --ha-input-padding-bottom: 0;
      }
      .arrow {
        flex: none;
        color: var(--secondary-text-color);
      }
      .values {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-4) var(--ha-space-8);
      }
      .value {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1);
      }
      .value .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .value .number {
        font-size: var(--ha-font-size-xl);
        font-weight: var(--ha-font-weight-medium);
        font-variant-numeric: tabular-nums;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-statistic": DialogStatistic;
  }
}

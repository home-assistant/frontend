import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chart/statistics-chart";
import "../../../../components/date-picker/ha-date-range-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-spinner";
import {
  apiContext,
  internationalizationContext,
} from "../../../../data/context";
import type { Statistics, StatisticType } from "../../../../data/recorder";
import {
  clearStatisticsRange,
  fetchStatistics,
  StatisticMeanType,
} from "../../../../data/recorder";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../../resources/styles";
import { showToast } from "../../../../util/toast";
import type { DialogStatisticsClearRangeParams } from "./show-dialog-statistics-clear-range";

// Longer ranges use hourly statistics to keep the preview fast.
const MAX_5MINUTE_PREVIEW_MS = 3 * 24 * 60 * 60 * 1000;

@customElement("dialog-statistics-clear-range")
class DialogStatisticsClearRange extends DialogMixin<DialogStatisticsClearRangeParams>(
  LitElement
) {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _start = new Date();

  @state() private _end = new Date();

  @state() private _statistics?: Statistics;

  @state() private _busy = false;

  @state() private _error?: string;

  // Incremented for every fetch, so results of outdated fetches are ignored
  private _fetchId = 0;

  connectedCallback() {
    super.connectedCallback();
    this._end.setMinutes(
      this._end.getMinutes() - (this._end.getMinutes() % 5),
      0,
      0
    );
    this._start = new Date(this._end.getTime() - 24 * 60 * 60 * 1000);
    this._fetchStatistics();
  }

  private get _validRange() {
    return this._start.getTime() < this._end.getTime();
  }

  private get _statTypes(): StatisticType[] {
    return this.params!.statistic.mean_type !== StatisticMeanType.NONE
      ? ["mean", "min", "max"]
      : ["change"];
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const statisticId = this.params.statistic.statistic_id;
    const hasData = Boolean(this._statistics?.[statisticId]?.length);

    return html`
      <ha-dialog
        open
        width="large"
        .headerTitle=${localize(
          "ui.panel.config.tools.tabs.statistics.clear_range.title"
        )}
        .preventScrimClose=${this._busy}
      >
        <p>
          ${localize(
            "ui.panel.config.tools.tabs.statistics.clear_range.info_text",
            { name: html`<b>${this.params.name}</b>` }
          )}
        </p>
        <ha-date-range-picker
          time-picker
          .startDate=${this._start}
          .endDate=${this._end}
          .disabled=${this._busy}
          @value-changed=${this._rangeChanged}
        ></ha-date-range-picker>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          !this._validRange
            ? html`<ha-alert alert-type="error">
                ${localize(
                  "ui.panel.config.tools.tabs.statistics.clear_range.invalid_range"
                )}
              </ha-alert>`
            : !this._statistics
              ? html`<div class="preview center">
                  <ha-spinner></ha-spinner>
                </div>`
              : !hasData
                ? html`<div class="preview center">
                    ${localize(
                      "ui.panel.config.tools.tabs.statistics.clear_range.no_statistics_found"
                    )}
                  </div>`
                : html`<div class="preview">
                    <statistics-chart
                      .statisticsData=${this._statistics}
                      .metadata=${{ [statisticId]: this.params.statistic }}
                      .names=${{ [statisticId]: this.params.name }}
                      .statTypes=${this._statTypes}
                      .chartType=${
                        this._statTypes[0] === "change" ? "bar" : "line"
                      }
                      .startTime=${this._start}
                      .endTime=${this._end}
                      hide-legend
                      .clickForMoreInfo=${false}
                      height="240px"
                    ></statistics-chart>
                  </div>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            .disabled=${this._busy}
            @click=${this.closeDialog}
          >
            ${localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            variant="danger"
            .loading=${this._busy}
            .disabled=${this._busy || !this._validRange || !hasData}
            @click=${this._delete}
          >
            ${localize("ui.common.delete")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _rangeChanged(
    ev: HASSDomEvent<{ value: { startDate: Date; endDate: Date } }>
  ) {
    this._start = ev.detail.value.startDate;
    this._end = ev.detail.value.endDate;
    this._fetchStatistics();
  }

  private async _fetchStatistics() {
    const fetchId = ++this._fetchId;
    this._statistics = undefined;
    this._error = undefined;
    if (!this._validRange) {
      return;
    }
    const start = this._start;
    const end = this._end;
    try {
      const statistics = await fetchStatistics(
        this._api.callWS,
        start,
        end,
        [this.params!.statistic.statistic_id],
        end.getTime() - start.getTime() > MAX_5MINUTE_PREVIEW_MS
          ? "hour"
          : "5minute",
        undefined,
        this._statTypes.includes("change") ? ["change"] : ["mean", "min", "max"]
      );
      if (fetchId === this._fetchId) {
        this._statistics = statistics;
      }
    } catch (err: any) {
      if (fetchId === this._fetchId) {
        this._statistics = {};
        this._error = err.message || err;
      }
    }
  }

  private async _delete() {
    this._busy = true;
    this._error = undefined;
    try {
      await clearStatisticsRange(
        this._api,
        [this.params!.statistic.statistic_id],
        this._start,
        this._end
      );
    } catch (err: any) {
      this._busy = false;
      this._error = err.message || err;
      return;
    }
    showToast(this, {
      message: this._i18n.localize(
        "ui.panel.config.tools.tabs.statistics.clear_range.deleted"
      ),
    });
    this.closeDialog();
  }

  static styles = [
    haStyleDialog,
    css`
      p {
        margin-top: 0;
      }
      ha-date-range-picker {
        display: block;
        margin-bottom: var(--ha-space-4);
      }
      .preview {
        min-height: 240px;
      }
      .center {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-statistics-clear-range": DialogStatisticsClearRange;
  }
}

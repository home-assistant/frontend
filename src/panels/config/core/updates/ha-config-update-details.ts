import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckCircleOutline,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { STRINGS_SEPARATOR_DOT } from "../../../../common/const";
import { formatShortDateTimeWithWeekday } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import type { UpdateEntity } from "../../../../data/update";
import type { UpdateReportSummary } from "../../../../data/update_report";
import {
  fetchUpdateReports,
  UPDATE_REPORT_PENDING_REFRESH_INTERVAL,
  updateReportPath,
} from "../../../../data/update_report";
import "../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../types";
import "./ha-config-update-report";

const SEVERITY_ICONS = {
  error: mdiAlertCircleOutline,
  warning: mdiAlertOutline,
};

// Older reports are behind "Show all"
const RECENT_UPDATES_SHOWN = 5;

@customElement("ha-config-update-details")
class HaConfigUpdateDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public entityId!: string;

  // Set when a report of this update is shown
  @property({ attribute: false }) public reportId?: string;

  // undefined while loading
  @state() private _reports?: UpdateReportSummary[];

  @state() private _error?: string;

  @state() private _showAll = false;

  private _refreshTimeout?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._refreshTimeout);
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (
      (changedProps.has("entityId") || changedProps.has("reportId")) &&
      !this.reportId
    ) {
      this._reports = undefined;
      this._error = undefined;
      this._showAll = false;
      this._fetchReports();
    }
  }

  private async _fetchReports(): Promise<void> {
    clearTimeout(this._refreshTimeout);
    try {
      this._reports = await fetchUpdateReports(this.hass, this.entityId);
      this._error = undefined;
    } catch (err: any) {
      // A failed refresh keeps showing the last known reports
      if (!this._reports) {
        this._error = err.message;
      }
    }
    if (this._reports?.some((report) => report.pending) && this.isConnected) {
      this._refreshTimeout = window.setTimeout(
        () => this._fetchReports(),
        UPDATE_REPORT_PENDING_REFRESH_INTERVAL
      );
    }
  }

  protected render() {
    if (this.reportId) {
      return html`<ha-config-update-report
        .hass=${this.hass}
        .narrow=${this.narrow}
        .entityId=${this.entityId}
        .reportId=${this.reportId}
      ></ha-config-update-report>`;
    }

    const stateObj = this.hass.states[this.entityId] as
      UpdateEntity | undefined;
    const name = stateObj
      ? stateObj.attributes.title || this.hass.formatEntityName(stateObj)
      : this.entityId;

    return html`
      <hass-subpage
        back-path="/config/updates"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${name}
      >
        <div class="content">
          ${
            stateObj
              ? this._renderItem(stateObj, name)
              : html`<ha-alert alert-type="warning">
                  ${this.hass.localize(
                    "ui.panel.config.updates.details.not_found"
                  )}
                </ha-alert>`
          }
          ${this._renderRecentUpdates()}
        </div>
      </hass-subpage>
    `;
  }

  private _renderItem(stateObj: UpdateEntity, name: string) {
    const { installed_version, latest_version } = stateObj.attributes;
    return html`
      <ha-card outlined>
        <ha-list-base>
          <ha-list-item-button @click=${this._openUpdateMoreInfo}>
            <state-badge slot="start" .stateObj=${stateObj}></state-badge>
            <span slot="headline">${name}</span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.updates.details.installed_version",
                { version: installed_version ?? "-" }
              )}
              ${
                stateObj.state === "on" && latest_version
                  ? html`${STRINGS_SEPARATOR_DOT}
                    ${this.hass.localize(
                      "ui.panel.config.updates.details.update_available",
                      { version: latest_version }
                    )}`
                  : nothing
              }
            </span>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-list-item-button>
        </ha-list-base>
      </ha-card>
    `;
  }

  private _renderRecentUpdates() {
    if (this._error) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize(
          "ui.panel.config.updates.details.recent.load_failed",
          { error: this._error }
        )}
      </ha-alert>`;
    }
    if (this._reports === undefined) {
      return html`<div class="loading"><ha-spinner></ha-spinner></div>`;
    }
    const reports = this._showAll
      ? this._reports
      : this._reports.slice(0, RECENT_UPDATES_SHOWN);
    return html`
      <ha-card outlined class="list-card">
        <div class="list-header" role="heading" aria-level="2">
          ${this.hass.localize("ui.panel.config.updates.details.recent.title")}
        </div>
        ${
          this._reports.length
            ? html`<ha-list-base>
                ${reports.map((report) => this._renderReportRow(report))}
              </ha-list-base>`
            : html`<div class="card-content">
                ${this.hass.localize(
                  "ui.panel.config.updates.details.recent.no_reports"
                )}
              </div>`
        }
        ${
          reports.length < this._reports.length
            ? html`<button class="link" @click=${this._showAllReports}>
                ${this.hass.localize(
                  "ui.panel.config.updates.details.recent.show_all",
                  { count: this._reports.length }
                )}
              </button>`
            : nothing
        }
      </ha-card>
    `;
  }

  private _renderReportRow(report: UpdateReportSummary) {
    const status = [
      this.hass.localize("ui.panel.config.updates.details.versions", {
        from_version: report.from_version,
        to_version: report.to_version,
      }),
      this.hass.localize(
        report.automatic
          ? "ui.panel.config.updates.details.recent.automatic"
          : "ui.panel.config.updates.details.recent.manual"
      ),
    ];
    if (report.pending) {
      status.push(
        this.hass.localize("ui.panel.config.updates.attention.pending")
      );
    } else if (report.severity) {
      status.push(
        this.hass.localize("ui.panel.config.updates.attention.repairs", {
          count: report.issues,
        })
      );
    }
    return html`
      <ha-list-item-button href=${updateReportPath(this.entityId, report.id)}>
        <div
          slot="start"
          class="icon-background ${report.severity ?? "success"}"
        >
          <ha-svg-icon
            .path=${
              report.severity
                ? SEVERITY_ICONS[report.severity]
                : mdiCheckCircleOutline
            }
          ></ha-svg-icon>
        </div>
        <span slot="headline">
          ${formatShortDateTimeWithWeekday(
            new Date(report.update_started),
            this.hass.locale,
            this.hass.config
          )}
        </span>
        <span slot="supporting-text">
          ${status.join(STRINGS_SEPARATOR_DOT)}
        </span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _showAllReports(): void {
    this._showAll = true;
  }

  private _openUpdateMoreInfo(): void {
    fireEvent(this, "hass-more-info", { entityId: this.entityId });
  }

  static styles = css`
    .content {
      padding: 28px var(--ha-content-gutter) 0;
      max-width: var(--ha-content-width-narrow);
      margin: 0 auto;
    }
    ha-card,
    ha-alert {
      display: block;
      margin-bottom: max(24px, var(--safe-area-inset-bottom));
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: var(--ha-space-8) 0;
    }
    .list-card {
      padding-bottom: var(--ha-space-2);
    }
    .list-header {
      padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-normal);
    }
    .icon-background {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      --mdc-icon-size: 24px;
    }
    .icon-background.success {
      background-color: var(--ha-color-fill-success-quiet-resting);
      color: var(--ha-color-on-success-quiet);
    }
    .icon-background.error {
      background-color: var(--ha-color-fill-danger-quiet-resting);
      color: var(--ha-color-on-danger-quiet);
    }
    .icon-background.warning {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-quiet);
    }
    ha-icon-next[slot="end"] {
      color: var(--secondary-text-color);
    }
    .link {
      display: block;
      margin: 0;
      padding: var(--ha-space-2) var(--ha-space-4);
      border: none;
      background: none;
      font: inherit;
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-normal);
      color: var(--ha-color-text-link);
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-update-details": HaConfigUpdateDetails;
  }
}

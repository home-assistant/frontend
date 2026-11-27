import { mdiAlertCircleOutline, mdiAlertOutline } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { STRINGS_SEPARATOR_DOT } from "../../../../common/const";
import { formatShortDateTimeWithWeekday } from "../../../../common/datetime/format_date_time";
import { formatTime } from "../../../../common/datetime/format_time";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import "../../../../components/item/ha-list-item-base";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import { domainToName } from "../../../../data/integration";
import type { RepairsIssue } from "../../../../data/repairs";
import {
  severitySort,
  subscribeRepairsIssueRegistry,
} from "../../../../data/repairs";
import type { UpdateEntity } from "../../../../data/update";
import type {
  UpdateReport,
  UpdateReportIssue,
} from "../../../../data/update_report";
import {
  fetchUpdateReport,
  UPDATE_REPORT_PENDING_REFRESH_INTERVAL,
  updateReportReleaseUrl,
  updateReportStartupSeconds,
} from "../../../../data/update_report";
import "../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import { openRepairsIssue } from "../../repairs/open-repairs-issue";

const SEVERITY_ICONS = {
  critical: mdiAlertCircleOutline,
  error: mdiAlertCircleOutline,
  warning: mdiAlertOutline,
};

// Critical issues use the error tint
const severityClass = (severity: RepairsIssue["severity"]) =>
  severity === "warning" ? "warning" : "error";

@customElement("ha-config-update-report")
class HaConfigUpdateReport extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: false }) public reportId!: string;

  // undefined while loading, null when the report does not exist
  @state() private _report?: UpdateReport | null;

  @state() private _error?: string;

  @state() private _issues: Record<string, RepairsIssue> = {};

  private _refreshTimeout?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._refreshTimeout);
  }

  protected hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeRepairsIssueRegistry(this.hass.connection, ({ issues }) => {
        this._issues = Object.fromEntries(
          issues.map((issue) => [`${issue.domain}.${issue.issue_id}`, issue])
        );
        this.hass.loadBackendTranslation("issues", [
          ...new Set(issues.map((issue) => issue.domain)),
        ]);
      }),
    ];
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("entityId") || changedProps.has("reportId")) {
      this._report = undefined;
      this._error = undefined;
      this._fetchReport();
    }
  }

  private async _fetchReport(): Promise<void> {
    clearTimeout(this._refreshTimeout);
    try {
      const report = await fetchUpdateReport(
        this.hass,
        this.entityId,
        this.reportId
      );
      this._error = undefined;
      this._report = report;
      if (report) {
        this.hass.loadBackendTranslation("title", [
          ...new Set(report.issues.map((issue) => issue.domain)),
        ]);
      }
    } catch (err: any) {
      // A failed refresh keeps showing the last known report
      if (!this._report) {
        this._error = err.message;
      }
    }
    if (this._report?.pending && this.isConnected) {
      this._refreshTimeout = window.setTimeout(
        () => this._fetchReport(),
        UPDATE_REPORT_PENDING_REFRESH_INTERVAL
      );
    }
  }

  protected render() {
    return html`
      <hass-subpage
        .backPath=${`/config/updates/details/${this.entityId}`}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.updates.details.report.title",
          {
            date: this._report?.update_started
              ? this._formatDateTime(this._report.update_started)
              : "",
          }
        )}
      >
        <div class="content">${this._renderContent()}</div>
      </hass-subpage>
    `;
  }

  private _renderContent() {
    if (this._error) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize(
          "ui.panel.config.updates.details.report.load_failed",
          { error: this._error }
        )}
      </ha-alert>`;
    }
    if (this._report === undefined) {
      return html`<div class="loading"><ha-spinner></ha-spinner></div>`;
    }
    const report = this._report;
    if (!report) {
      return html`<ha-alert alert-type="warning">
        ${this.hass.localize("ui.panel.config.updates.details.report.not_found")}
      </ha-alert>`;
    }

    return html`
      ${this._renderStatus(report)} ${this._renderIssues(report)}
      ${this._renderTimeline(report)}
    `;
  }

  private _renderStatus(report: UpdateReport) {
    const stateObj = this.hass.states[this.entityId] as
      UpdateEntity | undefined;
    const name = stateObj
      ? stateObj.attributes.title || this.hass.formatEntityName(stateObj)
      : this.entityId;
    const subtitle = [
      this.hass.localize("ui.panel.config.updates.details.versions", {
        from_version: report.from_version,
        to_version: report.to_version,
      }),
      this.hass.localize(
        report.automatic
          ? "ui.panel.config.updates.details.report.installed_automatically"
          : "ui.panel.config.updates.details.report.installed",
        { date: this._formatDateTime(report.update_started) }
      ),
    ];
    if (report.created) {
      subtitle.push(
        this.hass.localize("ui.panel.config.updates.details.report.checked", {
          time: this._formatTime(report.created),
        })
      );
    }
    return html`
      <ha-card outlined>
        <div class="card-content status">
          <div class="name">${name}</div>
          <div class="subtitle">${subtitle.join(STRINGS_SEPARATOR_DOT)}</div>
          ${
            report.severity && !report.pending
              ? this._renderResult(report)
              : nothing
          }
          <div class="whats-new">
            <div class="card-title">
              ${this.hass.localize(
                "ui.panel.config.updates.details.report.whats_new",
                { version: report.to_version }
              )}
            </div>
            <a
              class="link"
              href=${updateReportReleaseUrl(report.to_version)}
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize(
                "ui.panel.config.updates.details.report.release_notes"
              )}
            </a>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderResult(report: UpdateReport) {
    const severity = report.severity!;
    return html`
      <div class="result">
        <div class="icon-background ${severity}">
          <ha-svg-icon .path=${SEVERITY_ICONS[severity]}></ha-svg-icon>
        </div>
        <div class="text">
          <div class="headline">
            ${this.hass.localize(
              "ui.panel.config.updates.details.report.result.repairs",
              { count: report.issues.length }
            )}
          </div>
          <div class="description">
            ${this.hass.localize(
              "ui.panel.config.updates.details.report.result.repairs_description"
            )}
          </div>
        </div>
      </div>
    `;
  }

  private _renderIssues(report: UpdateReport) {
    // Figma 5.3: nothing but the timeline while the check runs
    if (report.pending || !report.issues.length) {
      return nothing;
    }
    return html`
      <ha-card outlined class="list-card">
        <div class="list-header" role="heading" aria-level="2">
          ${this.hass.localize(
            "ui.panel.config.updates.details.report.repairs"
          )}
        </div>
        <ha-list-base>
          ${[...report.issues]
            .sort((a, b) => severitySort[a.severity] - severitySort[b.severity])
            .map((issue) => this._renderIssue(issue))}
        </ha-list-base>
      </ha-card>
    `;
  }

  private _renderIssue(issue: UpdateReportIssue) {
    const current = this._issues[`${issue.domain}.${issue.issue_id}`];
    const translationKey = current?.translation_key || issue.issue_id;
    const title =
      this.hass.localize(
        `component.${issue.domain}.issues.${translationKey}.title`,
        current?.translation_placeholders || {}
      ) || `${issue.domain}: ${translationKey}`;
    const status = [
      domainToName(this.hass.localize, issue.domain),
      current
        ? this.hass.localize(`ui.panel.config.repairs.${issue.severity}`)
        : this.hass.localize(
            "ui.panel.config.updates.details.report.issue_resolved"
          ),
    ].join(STRINGS_SEPARATOR_DOT);
    const icon = html`<div
      slot="start"
      class="icon-background ${severityClass(issue.severity)}"
    >
      <ha-svg-icon .path=${SEVERITY_ICONS[issue.severity]}></ha-svg-icon>
    </div>`;
    // Resolved issues can no longer be opened
    if (!current) {
      return html`<ha-list-item-base class="resolved">
        ${icon}
        <span slot="headline">${title}</span>
        <span slot="supporting-text">${status}</span>
      </ha-list-item-base>`;
    }
    return html`
      <ha-list-item-button
        data-issue-key=${`${issue.domain}.${issue.issue_id}`}
        @click=${this._openIssue}
      >
        ${icon}
        <span slot="headline">${title}</span>
        <span slot="supporting-text">${status}</span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderTimeline(report: UpdateReport) {
    const rows: { time: string; text: string; dot?: string }[] = [];
    if (report.backup) {
      rows.push({
        time: report.update_started,
        text: this.hass.localize(
          "ui.panel.config.updates.details.report.timeline.backup"
        ),
      });
    }
    rows.push({
      time: report.update_started,
      text: this.hass.localize(
        "ui.panel.config.updates.details.report.timeline.installed",
        { version: report.to_version }
      ),
    });
    if (report.started) {
      const seconds = updateReportStartupSeconds(report);
      rows.push({
        time: report.started,
        text:
          seconds === undefined
            ? this.hass.localize(
                "ui.panel.config.updates.details.report.timeline.started"
              )
            : this.hass.localize(
                "ui.panel.config.updates.details.report.timeline.started_in",
                { count: seconds }
              ),
      });
    }
    if (report.created) {
      rows.push({
        time: report.created,
        text: report.severity
          ? this.hass.localize(
              "ui.panel.config.updates.details.report.timeline.finished_repairs",
              { count: report.issues.length }
            )
          : this.hass.localize(
              "ui.panel.config.updates.details.report.timeline.finished_ok"
            ),
        dot: report.severity ?? undefined,
      });
    }
    if (report.pending) {
      rows.push({
        time: new Date().toISOString(),
        text: this.hass.localize(
          "ui.panel.config.updates.details.report.timeline.checking"
        ),
        dot: "warning",
      });
    }
    return html`
      <ha-card outlined>
        <div class="card-content timeline-card">
          <div class="card-title">
            ${this.hass.localize(
              "ui.panel.config.updates.details.report.timeline.title"
            )}
          </div>
          <div class="timeline">
            ${rows.map(
              (row) => html`
                <span class="time">${this._formatTime(row.time)}</span>
                <span class="dot ${row.dot ?? ""}"></span>
                <span>${row.text}</span>
              `
            )}
          </div>
          ${
            report.severity && !report.pending
              ? html`<a
                  class="link"
                  href="/config/logs"
                  @click=${this._showLogs}
                >
                  ${this.hass.localize(
                    "ui.panel.config.updates.details.report.timeline.show_logs"
                  )}
                </a>`
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  private _formatDateTime(isoDate: string): string {
    return formatShortDateTimeWithWeekday(
      new Date(isoDate),
      this.hass.locale,
      this.hass.config
    );
  }

  private _formatTime(isoDate: string): string {
    return formatTime(new Date(isoDate), this.hass.locale, this.hass.config);
  }

  private _showLogs(ev: Event): void {
    ev.preventDefault();
    navigate("/config/logs");
  }

  private _openIssue(ev: Event): void {
    const issue =
      this._issues[(ev.currentTarget as HTMLElement).dataset.issueKey!];
    if (issue) {
      openRepairsIssue(this, this.hass, issue);
    }
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
    .status {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
      line-height: var(--ha-line-height-normal);
    }
    .name {
      font-size: var(--ha-font-size-xl);
    }
    .subtitle,
    .description,
    .time {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }
    .result {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      padding: var(--ha-space-2) 0 var(--ha-space-1);
    }
    .result .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .headline,
    .card-title {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }
    .icon-background {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      --mdc-icon-size: 24px;
    }
    .icon-background.error {
      background-color: var(--ha-color-fill-danger-quiet-resting);
      color: var(--ha-color-on-danger-quiet);
    }
    .icon-background.warning {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-quiet);
    }
    .whats-new {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ha-space-3);
      margin-top: var(--ha-space-2);
      padding: var(--ha-space-4);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
    }
    .link {
      display: block;
      padding: var(--ha-space-2) 0;
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-normal);
      color: var(--ha-color-text-link);
      text-decoration: none;
    }
    .list-card {
      padding-bottom: var(--ha-space-2);
    }
    .list-header {
      padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-normal);
    }
    ha-icon-next[slot="end"] {
      color: var(--secondary-text-color);
    }
    .resolved {
      opacity: var(--light-secondary-opacity);
    }
    .timeline-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ha-space-3);
      line-height: var(--ha-line-height-normal);
    }
    .timeline {
      display: grid;
      grid-template-columns: minmax(40px, max-content) auto 1fr;
      align-items: center;
      column-gap: var(--ha-space-3);
      row-gap: var(--ha-space-3);
      width: 100%;
      font-size: var(--ha-font-size-m);
    }
    .time {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--success-color);
    }
    .dot.warning {
      background-color: var(--warning-color);
    }
    .dot.error {
      background-color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-update-report": HaConfigUpdateReport;
  }
}

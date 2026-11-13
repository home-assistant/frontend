import { mdiRobot, mdiScriptText } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { STRINGS_SEPARATOR_DOT } from "../../../../common/const";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/entity/state-badge";
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
import { subscribeRepairsIssueRegistry } from "../../../../data/repairs";
import type { UpdateEntity } from "../../../../data/update";
import type {
  UpdateReport,
  UpdateReportConfigEntry,
  UpdateReportIssue,
  UpdateReportReference,
  UpdateReportUpcomingIssue,
} from "../../../../data/update_report";
import {
  fetchUpdateReport,
  UPDATE_REPORT_PENDING_REFRESH_INTERVAL,
  updateReportReferencePath,
  updateReportReferences,
  updateReportWorseCount,
} from "../../../../data/update_report";
import "../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import { openRepairsIssue } from "../../repairs/open-repairs-issue";

@customElement("ha-config-update-details")
class HaConfigUpdateDetails extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public entityId!: string;

  // undefined while loading, null when there is no report
  @state() private _report?: UpdateReport | null;

  @state() private _error?: string;

  @state() private _issues: Record<string, RepairsIssue> = {};

  // Translated setup failure per config entry_id
  @state() private _reasons: Record<string, string> = {};

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
    if (changedProps.has("entityId")) {
      this._report = undefined;
      this._fetchReport();
    }
  }

  private async _fetchReport(): Promise<void> {
    clearTimeout(this._refreshTimeout);
    let report: UpdateReport | null;
    try {
      report = await fetchUpdateReport(this.hass, this.entityId);
    } catch (err: any) {
      this._error = err.message;
      return;
    }
    this._error = undefined;
    this._report = report;
    if (!report) {
      return;
    }
    if (report.pending && this.isConnected) {
      this._refreshTimeout = window.setTimeout(
        () => this._fetchReport(),
        UPDATE_REPORT_PENDING_REFRESH_INTERVAL
      );
    }
    this.hass.loadBackendTranslation("title", [
      ...new Set([
        ...report.config_entries.map((entry) => entry.domain),
        ...report.entities_unavailable.map((entity) => entity.platform),
        ...report.entities_renamed.map((entity) => entity.platform),
        ...report.entities_removed.map((entity) => entity.platform),
      ]),
    ]);
    this._localizeReasons(report.config_entries);
  }

  private async _localizeReasons(
    entries: UpdateReportConfigEntry[]
  ): Promise<void> {
    const reasons: Record<string, string> = {};
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.translation_key) {
          return;
        }
        // Shared helpers raise errors translated by another integration
        const domain = entry.translation_domain || entry.domain;
        const localize = await this.hass.loadBackendTranslation(
          "exceptions",
          domain
        );
        const reason = localize(
          `component.${domain}.exceptions.${entry.translation_key}.message`,
          entry.translation_placeholders ?? undefined
        );
        if (reason) {
          reasons[entry.entry_id] = reason;
        }
      })
    );
    this._reasons = reasons;
  }

  protected render() {
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
          ${this._renderReport()}
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

  private _renderReport() {
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

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.updates.details.report.title"
        )}
      >
        <div class="card-content">
          ${
            report
              ? html`
                  <p class="secondary">
                    ${this.hass.localize(
                      "ui.panel.config.updates.details.report.versions",
                      {
                        from_version: report.from_version,
                        to_version: report.to_version,
                      }
                    )}
                    ${
                      report.created
                        ? html`<br />${this.hass.localize(
                              "ui.panel.config.updates.details.report.created",
                              {
                                date: formatDateTime(
                                  new Date(report.created),
                                  this.hass.locale,
                                  this.hass.config
                                ),
                              }
                            )}`
                        : nothing
                    }
                  </p>
                  ${
                    report.pending
                      ? html`<ha-alert alert-type="info">
                          ${this.hass.localize(
                            "ui.panel.config.updates.details.report.pending"
                          )}
                        </ha-alert>`
                      : nothing
                  }
                  ${
                    updateReportWorseCount(report)
                      ? nothing
                      : html`<p>
                          ${this.hass.localize(
                            "ui.panel.config.updates.details.report.nothing_got_worse"
                          )}
                        </p>`
                  }
                `
              : html`<p>
                  ${this.hass.localize(
                    "ui.panel.config.updates.details.report.no_report"
                  )}
                </p>`
          }
        </div>
      </ha-card>
      ${
        report
          ? html`
              ${this._renderSection(
                "integrations",
                report.config_entries.map((entry) =>
                  this._renderConfigEntry(entry)
                )
              )}
              ${this._renderSection(
                "unavailable",
                report.entities_unavailable.map(
                  (entity) => html`
                    <ha-list-item-button
                      data-entity-id=${entity.entity_id}
                      @click=${this._openEntityMoreInfo}
                    >
                      ${this._renderBrand(entity.platform)}
                      <span slot="headline"
                        >${this._entityName(entity.entity_id)}</span
                      >
                      <span slot="supporting-text">
                        ${entity.entity_id}${STRINGS_SEPARATOR_DOT}${this.hass.localize(
                          `ui.panel.config.updates.details.report.state_${entity.state ?? "missing"}`
                        )}
                      </span>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `
                )
              )}
              ${this._renderSection(
                "renamed",
                report.entities_renamed.map(
                  (entity) => html`
                    <ha-list-item-button
                      data-entity-id=${entity.entity_id}
                      @click=${this._openEntityMoreInfo}
                    >
                      ${this._renderBrand(entity.platform)}
                      <span slot="headline"
                        >${this._entityName(entity.entity_id)}</span
                      >
                      <span slot="supporting-text">
                        ${entity.entity_id}${STRINGS_SEPARATOR_DOT}${this.hass.localize(
                          "ui.panel.config.updates.details.report.renamed_from",
                          { old_entity_id: entity.old_entity_id }
                        )}
                      </span>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                    ${updateReportReferences(entity).map((reference) =>
                      this._renderReference(reference, entity.old_entity_id)
                    )}
                  `
                )
              )}
              ${this._renderSection(
                "removed",
                report.entities_removed.map(
                  (entity) => html`
                    <ha-list-item-base>
                      ${this._renderBrand(entity.platform)}
                      <span slot="headline">${entity.entity_id}</span>
                      <span slot="supporting-text">
                        ${domainToName(this.hass.localize, entity.platform)}
                      </span>
                    </ha-list-item-base>
                    ${updateReportReferences(entity).map((reference) =>
                      this._renderReference(reference, entity.entity_id)
                    )}
                  `
                )
              )}
              ${this._renderSection(
                "issues",
                report.issues.map((issue) => this._renderIssue(issue))
              )}
              ${this._renderSection(
                "upcoming",
                report.upcoming.map((issue) => this._renderIssue(issue))
              )}
            `
          : nothing
      }
    `;
  }

  private _renderSection(
    key:
      | "integrations"
      | "unavailable"
      | "renamed"
      | "removed"
      | "issues"
      | "upcoming",
    items: TemplateResult[]
  ) {
    if (!items.length) {
      return nothing;
    }
    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          `ui.panel.config.updates.details.report.sections.${key}`
        )}
      >
        <ha-list-base>${items}</ha-list-base>
      </ha-card>
    `;
  }

  private _renderBrand(domain: string) {
    return html`<img
      slot="start"
      alt=""
      loading="lazy"
      src=${brandsUrl(
        {
          domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        },
        this.hass.auth.data.hassUrl
      )}
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />`;
  }

  private _renderConfigEntry(entry: UpdateReportConfigEntry) {
    const status = [
      domainToName(this.hass.localize, entry.domain),
      entry.state
        ? this.hass.localize(
            `ui.panel.config.integrations.config_entry.state.${entry.state}`
          )
        : this.hass.localize(
            "ui.panel.config.updates.details.report.integration_removed"
          ),
    ].join(STRINGS_SEPARATOR_DOT);
    const content = html`
      ${this._renderBrand(entry.domain)}
      <span slot="headline">${entry.title}</span>
      <span slot="supporting-text">${status}</span>
      ${
        this._reasons[entry.entry_id]
          ? html`<span slot="supporting-text" class="reason"
              >${this._reasons[entry.entry_id]}</span
            >`
          : nothing
      }
    `;
    // A removed entry has no integration page to go to
    if (!entry.state) {
      return html`<ha-list-item-base>${content}</ha-list-item-base>`;
    }
    return html`
      <ha-list-item-button
        href=${`/config/integrations/integration/${entry.domain}#config_entry=${entry.entry_id}`}
      >
        ${content}
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderReference(reference: UpdateReportReference, oldId: string) {
    return html`
      <ha-list-item-button
        class="reference"
        href=${updateReportReferencePath(reference)}
      >
        <ha-svg-icon
          slot="start"
          .path=${
            computeDomain(reference.entity_id) === "automation"
              ? mdiRobot
              : mdiScriptText
          }
        ></ha-svg-icon>
        <span slot="headline">${reference.name ?? reference.entity_id}</span>
        <span slot="supporting-text">
          ${this.hass.localize(
            "ui.panel.config.updates.details.report.uses_old_entity_id",
            { entity_id: oldId }
          )}
        </span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderIssue(issue: UpdateReportIssue | UpdateReportUpcomingIssue) {
    const current = this._issues[`${issue.domain}.${issue.issue_id}`];
    const translationKey = current?.translation_key || issue.issue_id;
    const title =
      this.hass.localize(
        `component.${issue.domain}.issues.${translationKey}.title`,
        current?.translation_placeholders || {}
      ) || `${issue.domain}: ${translationKey}`;
    const status: string[] = [];
    if ("breaks_in_ha_version" in issue) {
      status.push(
        this.hass.localize(
          "ui.panel.config.updates.details.report.breaks_in_version",
          { version: issue.breaks_in_ha_version }
        )
      );
      if (issue.dismissed) {
        status.push(
          this.hass.localize("ui.panel.config.updates.details.report.ignored")
        );
      }
    } else {
      status.push(domainToName(this.hass.localize, issue.domain));
    }
    if (!current) {
      status.push(
        this.hass.localize(
          "ui.panel.config.updates.details.report.issue_resolved"
        )
      );
    }
    const brand = this._renderBrand(
      ("issue_domain" in issue && issue.issue_domain) || issue.domain
    );
    // Resolved issues can no longer be opened
    if (!current) {
      return html`<ha-list-item-base class="resolved">
        ${brand}
        <span slot="headline">${title}</span>
        <span slot="supporting-text"
          >${status.join(STRINGS_SEPARATOR_DOT)}</span
        >
      </ha-list-item-base>`;
    }
    return html`
      <ha-list-item-button
        data-issue-key=${`${issue.domain}.${issue.issue_id}`}
        @click=${this._openIssue}
      >
        ${brand}
        <span slot="headline">${title}</span>
        <span slot="supporting-text"
          >${status.join(STRINGS_SEPARATOR_DOT)}</span
        >
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _entityName(entityId: string): string {
    const stateObj = this.hass.states[entityId];
    return (stateObj && this.hass.formatEntityName(stateObj)) || entityId;
  }

  private _openUpdateMoreInfo(): void {
    fireEvent(this, "hass-more-info", { entityId: this.entityId });
  }

  private _openEntityMoreInfo(ev: Event): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as HTMLElement).dataset.entityId!,
    });
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
    .card-content ha-alert {
      margin-bottom: 0;
    }
    .card-content p {
      margin: 0 0 var(--ha-space-2);
    }
    .secondary {
      color: var(--secondary-text-color);
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: var(--ha-space-8) 0;
    }
    img[slot="start"] {
      width: 40px;
      height: 40px;
    }
    ha-svg-icon[slot="start"],
    ha-icon-next[slot="end"] {
      color: var(--secondary-text-color);
    }
    .reference {
      padding-inline-start: var(--ha-space-10);
    }
    .reason {
      display: block;
      white-space: normal;
    }
    .resolved {
      opacity: var(--light-secondary-opacity);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-update-details": HaConfigUpdateDetails;
  }
}

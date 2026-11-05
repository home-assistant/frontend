import type { ContextType } from "@lit/context";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { consume } from "../../../common/decorators/consume";
import { preserveUnchangedEntityStatesRecord } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-spinner";
import {
  apiContext,
  configContext,
  connectionContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
} from "../../../data/context";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { domainToName } from "../../../data/integration";
import type {
  RepairsIssue,
  UpdateReport,
  UpdateReportAffected,
  UpdateReportIssue,
} from "../../../data/repairs";
import {
  dismissUpdateReport,
  fetchRepairsIssues,
  fetchUpdateReport,
  updateReportAffected,
  updateReportOldEntityIds,
} from "../../../data/repairs";
import type { RelatedResult } from "../../../data/search";
import { findRelated } from "../../../data/search";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistantConfig } from "../../../types";

@customElement("dialog-update-report")
class DialogUpdateReport extends DialogMixin(LitElement) {
  // undefined while loading, null when there is no report
  @state() private _report?: UpdateReport | null;

  @state() private _issues: Record<string, RepairsIssue> = {};

  @state() private _affected: UpdateReportAffected[] = [];

  @state() private _error?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, boolean>({
    transformer: ({ user }) => user?.is_admin ?? false,
  })
  private _isAdmin = false;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: DialogUpdateReport, states) {
      const affected: HassEntities = {};
      this._affected.forEach(({ entity_id }) => {
        if (states?.[entity_id]) {
          affected[entity_id] = states[entity_id];
        }
      });
      return preserveUnchangedEntityStatesRecord(this._states, affected);
    },
    watch: ["_affected"],
  })
  private _states: HassEntities = {};

  // Script config IDs are registry unique_ids, not entity object IDs
  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  @transform<EntityRegistryEntry[] | undefined, Record<string, string>>({
    transformer: function (this: DialogUpdateReport, entries) {
      const affected = new Set(this._affected.map((item) => item.entity_id));
      return Object.fromEntries(
        (entries ?? [])
          .filter((entry) => affected.has(entry.entity_id))
          .map((entry) => [entry.entity_id, entry.unique_id])
      );
    },
    watch: ["_affected"],
  })
  private _uniqueIds?: Record<string, string>;

  connectedCallback() {
    super.connectedCallback();
    this._fetchReport();
  }

  private async _fetchReport(): Promise<void> {
    let report: UpdateReport | null;
    try {
      const [fetchedReport, { issues }] = await Promise.all([
        fetchUpdateReport(this._api),
        fetchRepairsIssues(this._connection.connection),
      ]);
      report = fetchedReport;
      this._issues = Object.fromEntries(
        issues.map((issue) => [`${issue.domain}.${issue.issue_id}`, issue])
      );
      this._i18n.loadBackendTranslation("issues", [
        ...new Set(issues.map((issue) => issue.domain)),
      ]);
    } catch (err: any) {
      this._error = err.message;
      return;
    }
    this._report = report;
    if (report) {
      this._loadAffected(report);
    }
  }

  private async _loadAffected(report: UpdateReport): Promise<void> {
    const oldEntityIds = updateReportOldEntityIds(report);
    if (!oldEntityIds.size || !isComponentLoaded(this._hassConfig, "search")) {
      return;
    }
    const related: Record<string, RelatedResult> = Object.fromEntries(
      await Promise.all(
        [...oldEntityIds.keys()].map(async (entityId) => [
          entityId,
          await findRelated(this._api, "entity", entityId).catch(() => ({})),
        ])
      )
    );
    this._affected = updateReportAffected(oldEntityIds, related);
  }

  protected render() {
    const report = this._report;

    return html`
      <ha-dialog
        open
        width="large"
        header-title=${
          report
            ? this._i18n.localize(
                "ui.panel.config.repairs.update_report.title",
                {
                  version: report.to_version,
                }
              )
            : this._i18n.localize(
                "ui.panel.config.repairs.update_report.caption"
              )
        }
        header-subtitle=${
          report
            ? this._i18n.localize(
                "ui.panel.config.repairs.update_report.subtitle",
                {
                  version: report.from_version,
                  date: formatDateTime(
                    new Date(report.created),
                    this._i18n.locale,
                    this._hassConfig
                  ),
                }
              )
            : ""
        }
      >
        <div class="content">${this._renderContent()}</div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.close")}
          </ha-button>
          ${
            report && this._isAdmin
              ? html`
                  <ha-button slot="primaryAction" @click=${this._dismiss}>
                    ${this._i18n.localize(
                      "ui.panel.config.repairs.update_report.dismiss"
                    )}
                  </ha-button>
                `
              : nothing
          }
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderContent() {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (this._report === undefined) {
      return html`<div class="loading"><ha-spinner></ha-spinner></div>`;
    }
    if (this._report === null) {
      return html`<p>
        ${this._i18n.localize("ui.panel.config.repairs.update_report.no_report")}
      </p>`;
    }
    const report = this._report;
    const nothingChanged =
      !report.config_entries.length &&
      !report.entities_unavailable.length &&
      !report.entities_renamed.length &&
      !report.entities_removed.length &&
      !report.issues.length;

    return html`
      ${
        nothingChanged
          ? html`<p>
              ${this._i18n.localize(
                "ui.panel.config.repairs.update_report.nothing_changed"
              )}
            </p>`
          : nothing
      }
      ${this._renderSection(
        "integrations",
        report.config_entries.map(
          (entry) => html`
            <li>
              ${
                entry.state
                  ? html`<a
                      href=${`/config/integrations/integration/${entry.domain}#config_entry=${entry.entry_id}`}
                      @click=${this.closeDialog}
                      >${entry.title}</a
                    >`
                  : entry.title
              }
              <span class="secondary">
                ${domainToName(this._i18n.localize, entry.domain)} ·
                ${
                  entry.state
                    ? this._i18n.localize(
                        `ui.panel.config.integrations.config_entry.state.${entry.state}`
                      )
                    : this._i18n.localize(
                        "ui.panel.config.repairs.update_report.removed"
                      )
                }
                ${entry.reason ? html` · ${entry.reason}` : nothing}
              </span>
            </li>
          `
        )
      )}
      ${this._renderSection("entities", [
        ...report.entities_unavailable.map(
          (entity) => html`
            <li>
              ${this._renderEntity(entity.entity_id)}
              <span class="secondary">
                ${domainToName(this._i18n.localize, entity.platform)} ·
                ${this._i18n.localize(
                  `ui.panel.config.repairs.update_report.${entity.state ?? "no_state"}`
                )}
              </span>
            </li>
          `
        ),
        ...report.entities_renamed.map(
          (entity) => html`
            <li>
              <code>${entity.old_entity_id}</code> →
              ${this._renderEntity(entity.entity_id)}
              <span class="secondary">
                ${domainToName(this._i18n.localize, entity.platform)} ·
                ${this._i18n.localize(
                  "ui.panel.config.repairs.update_report.renamed"
                )}
              </span>
            </li>
          `
        ),
        ...report.entities_removed.map(
          (entity) => html`
            <li>
              <code>${entity.entity_id}</code>
              <span class="secondary">
                ${domainToName(this._i18n.localize, entity.platform)} ·
                ${this._i18n.localize(
                  "ui.panel.config.repairs.update_report.removed"
                )}
              </span>
            </li>
          `
        ),
      ])}
      ${this._renderSection(
        "affected",
        this._affected.map((item) => this._renderAffected(item))
      )}
      ${this._renderSection(
        "issues",
        report.issues.map((issue) => html`<li>${this._issueTitle(issue)}</li>`)
      )}
      ${this._renderSection(
        "upcoming",
        report.upcoming.map(
          (issue) => html`
            <li>
              ${this._issueTitle(issue)}
              <span class="secondary">
                ${this._i18n.localize(
                  "ui.panel.config.repairs.update_report.breaks_in_version",
                  { version: issue.breaks_in_ha_version }
                )}
                ${
                  issue.dismissed
                    ? html` ·
                      ${this._i18n.localize(
                        "ui.panel.config.repairs.update_report.ignored"
                      )}`
                    : nothing
                }
              </span>
            </li>
          `
        )
      )}
    `;
  }

  private _renderSection(
    key: "integrations" | "entities" | "affected" | "issues" | "upcoming",
    items: TemplateResult[]
  ) {
    if (!items.length) {
      return nothing;
    }
    return html`
      <h3>
        ${this._i18n.localize(
          `ui.panel.config.repairs.update_report.sections.${key}`
        )}
      </h3>
      <ul>
        ${items}
      </ul>
    `;
  }

  private _renderEntity(entityId: string) {
    return html`<button
      class="link"
      data-entity-id=${entityId}
      @click=${this._showMoreInfo}
    >
      ${entityId}
    </button>`;
  }

  private _renderAffected(item: UpdateReportAffected) {
    const domain = computeDomain(item.entity_id);
    const stateObj = this._states[item.entity_id];
    const name = stateObj ? computeStateName(stateObj) : item.entity_id;
    const configId =
      domain === "automation"
        ? stateObj?.attributes.id
        : this._uniqueIds?.[item.entity_id];
    const href = configId
      ? `/config/${domain}/edit/${encodeURIComponent(configId)}`
      : `/config/${domain}/show/${encodeURIComponent(item.entity_id)}`;
    return html`
      <li>
        <a href=${href} @click=${this.closeDialog}>${name}</a>
        <span class="secondary">
          ${
            item.new_entity_id
              ? this._i18n.localize(
                  "ui.panel.config.repairs.update_report.uses_renamed",
                  {
                    old_entity_id: item.old_entity_id,
                    new_entity_id: item.new_entity_id,
                  }
                )
              : this._i18n.localize(
                  "ui.panel.config.repairs.update_report.uses_removed",
                  { old_entity_id: item.old_entity_id }
                )
          }
        </span>
      </li>
    `;
  }

  private _issueTitle(issue: UpdateReportIssue) {
    const current = this._issues[`${issue.domain}.${issue.issue_id}`];
    const key = current?.translation_key || issue.issue_id;
    return (
      this._i18n.localize(
        `component.${issue.domain}.issues.${key}.title`,
        current?.translation_placeholders || {}
      ) || `${issue.domain}: ${key}`
    );
  }

  private _showMoreInfo(ev: Event): void {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entityId;
    if (entityId) {
      fireEvent(this, "hass-more-info", { entityId });
    }
  }

  private async _dismiss(): Promise<void> {
    try {
      await dismissUpdateReport(this._api);
    } catch (err: any) {
      this._error = err.message;
      return;
    }
    this.closeDialog();
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    css`
      ha-dialog {
        --ha-dialog-header-white-space: normal;
        --ha-dialog-header-title-height: auto;
      }
      .content {
        padding-top: 0;
      }
      h3 {
        margin: var(--ha-space-4) 0 var(--ha-space-2);
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
      }
      ul {
        margin: 0;
        padding-inline-start: var(--ha-space-5);
      }
      li {
        margin-bottom: var(--ha-space-1);
        overflow-wrap: anywhere;
      }
      .secondary {
        display: block;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      a,
      button.link {
        color: var(--primary-color);
      }
      button.link {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
        text-align: start;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-6);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-update-report": DialogUpdateReport;
  }
}

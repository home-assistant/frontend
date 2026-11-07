import {
  mdiAlertCircle,
  mdiCheckCircle,
  mdiInformation,
  mdiAlert,
} from "@mdi/js";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import { fetchConfigFlowInProgress } from "../../../data/config_flow";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
  statesContext,
} from "../../../data/context";
import type {
  ConfigEntryHealth,
  HealthStatus,
} from "../../../data/config_entry_health";
import { computeConfigEntryHealth } from "../../../data/config_entry_health";
import {
  domainToName,
  fetchIntegrationSetups,
} from "../../../data/integration";
import { fetchRepairsIssues } from "../../../data/repairs";
import { fetchSystemLog } from "../../../data/system_log";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../resources/styles";
import { renderConfigEntryError } from "./ha-config-integration-page";
import type { ConfigEntryHealthDialogParams } from "./show-dialog-config-entry-health";

const STATUS_ICONS: Record<HealthStatus, string> = {
  ok: mdiCheckCircle,
  warning: mdiAlert,
  error: mdiAlertCircle,
  info: mdiInformation,
};

const MAX_LISTED = 5;

@customElement("dialog-config-entry-health")
class DialogConfigEntryHealth extends DialogMixin<ConfigEntryHealthDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state() private _health?: ConfigEntryHealth;

  @state() private _error?: string;

  connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  private async _load(): Promise<void> {
    const { entry, entities } = this.params!;
    try {
      const [{ issues }, log, flows, setups] = await Promise.all([
        fetchRepairsIssues(this._connection.connection),
        fetchSystemLog(this._api),
        fetchConfigFlowInProgress(this._connection.connection),
        fetchIntegrationSetups(this._api),
      ]);
      this._health = computeConfigEntryHealth(
        entry,
        entities,
        this._states,
        issues,
        log,
        flows,
        setups
      );
    } catch (err: any) {
      this._error = err.message;
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.config.integrations.config_entry.health.title",
          { title: this.params.entry.title }
        )}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : this._health
              ? this._renderHealth(this._health)
              : html`<ha-spinner></ha-spinner>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this._i18n.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderHealth(health: ConfigEntryHealth) {
    const { entry } = this.params!;
    const key = "ui.panel.config.integrations.config_entry.health";
    // Repairs and log lines are only known per integration, not per entry.
    const integration = domainToName(this._i18n.localize, entry.domain);
    const entityName = (entityId: string) =>
      this._states[entityId]?.attributes.friendly_name ?? entityId;
    const more = (count: number) =>
      count > MAX_LISTED
        ? html`<li>
            ${this._i18n.localize(`${key}.and_more`, {
              count: count - MAX_LISTED,
            })}
          </li>`
        : nothing;

    return html`
      <ha-alert
        .alertType=${
          health.status === "ok"
            ? "success"
            : health.status === "error"
              ? "error"
              : "warning"
        }
      >
        ${this._i18n.localize(`${key}.summary.${health.status}`)}
      </ha-alert>
      <div class="rows">
        ${this._row(
          health.state,
          this._i18n.localize(
            entry.disabled_by
              ? `${key}.state.disabled`
              : `${key}.state.${entry.state}`
          ),
          health.state === "warning" || health.state === "error"
            ? html`<p>${renderConfigEntryError(this._i18n, entry)}</p>`
            : nothing
        )}
        ${
          health.flows.flows.length
            ? this._row(
                health.flows.status,
                this._i18n.localize(`${key}.flows`),
                html`<a href="/config/integrations/dashboard">
                  ${this._i18n.localize(`${key}.flows_link`)}
                </a>`
              )
            : nothing
        }
        ${
          health.entities.total
            ? this._row(
                health.entities.status,
                this._i18n.localize(`${key}.entities`, {
                  available:
                    health.entities.total - health.entities.unavailable.length,
                  total: health.entities.total,
                }),
                health.entities.unavailable.length
                  ? html`<ul>
                        ${health.entities.unavailable
                          .slice(0, MAX_LISTED)
                          .map(
                            (item) =>
                              html`<li>${entityName(item.entity_id)}</li>`
                          )}
                        ${more(health.entities.unavailable.length)}
                      </ul>
                      <a
                        href=${`/config/entities?historyBack=1&config_entry=${entry.entry_id}`}
                      >
                        ${this._i18n.localize(`${key}.entities_link`)}
                      </a>`
                  : nothing
              )
            : nothing
        }
        ${this._row(
          health.repairs.status,
          this._i18n.localize(`${key}.repairs`, {
            count: health.repairs.issues.length,
            integration,
          }),
          health.repairs.issues.length
            ? html`<a href="/config/repairs">
                ${this._i18n.localize(`${key}.repairs_link`)}
              </a>`
            : nothing
        )}
        ${this._row(
          health.logs.status,
          this._i18n.localize(`${key}.logs`, {
            errors: health.logs.errors,
            warnings: health.logs.warnings,
            integration,
          }),
          health.logs.errors || health.logs.warnings
            ? html`<a
                href=${`/config/logs?search=${encodeURIComponent(entry.domain)}`}
              >
                ${this._i18n.localize(`${key}.logs_link`)}
              </a>`
            : nothing
        )}
        ${
          health.setupSeconds !== undefined
            ? this._row(
                "info",
                health.setupSeconds < 0.1
                  ? this._i18n.localize(`${key}.setup_time_fast`, {
                      integration,
                    })
                  : this._i18n.localize(`${key}.setup_time`, {
                      integration,
                      seconds: health.setupSeconds.toFixed(1),
                    })
              )
            : nothing
        }
      </div>
    `;
  }

  private _row(
    status: HealthStatus,
    text: string,
    details: TemplateResult | typeof nothing = nothing
  ) {
    return html`<div class="row">
      <ha-svg-icon class=${status} .path=${STATUS_ICONS[status]}></ha-svg-icon>
      <div class="text">
        <span>${text}</span>
        ${details}
      </div>
    </div>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-spinner {
          display: block;
          margin: var(--ha-space-6) auto;
        }
        .rows {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          margin-top: var(--ha-space-4);
        }
        .row {
          display: flex;
          gap: var(--ha-space-3);
          align-items: flex-start;
        }
        .text {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
          min-width: 0;
        }
        .text p,
        .text ul {
          margin: 0;
          color: var(--secondary-text-color);
        }
        .text ul {
          padding-inline-start: var(--ha-space-5);
        }
        a {
          color: var(--primary-color);
        }
        ha-svg-icon {
          flex-shrink: 0;
        }
        ha-svg-icon.ok {
          color: var(--success-color);
        }
        ha-svg-icon.warning {
          color: var(--warning-color);
        }
        ha-svg-icon.error {
          color: var(--error-color);
        }
        ha-svg-icon.info {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-config-entry-health": DialogConfigEntryHealth;
  }
}

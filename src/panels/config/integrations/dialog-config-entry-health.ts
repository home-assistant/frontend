import {
  mdiAlertCircle,
  mdiCheckCircle,
  mdiInformation,
  mdiAlert,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import { fetchConfigFlowInProgress } from "../../../data/config_flow";
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
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
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
class DialogConfigEntryHealth extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ConfigEntryHealthDialogParams;

  @state() private _open = false;

  @state() private _health?: ConfigEntryHealth;

  @state() private _error?: string;

  public showDialog(params: ConfigEntryHealthDialogParams): void {
    this._params = params;
    this._health = undefined;
    this._error = undefined;
    this._open = true;
    this._load();
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _load(): Promise<void> {
    const { entry, entities } = this._params!;
    try {
      const [{ issues }, log, flows, setups] = await Promise.all([
        fetchRepairsIssues(this.hass.connection),
        fetchSystemLog(this.hass),
        fetchConfigFlowInProgress(this.hass.connection),
        fetchIntegrationSetups(this.hass),
      ]);
      this._health = computeConfigEntryHealth(
        entry,
        entities,
        this.hass.states,
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
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.integrations.config_entry.health.title",
          { title: this._params.entry.title }
        )}
        @closed=${this._dialogClosed}
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
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderHealth(health: ConfigEntryHealth) {
    const { entry } = this._params!;
    const key = "ui.panel.config.integrations.config_entry.health";
    // Repairs and log lines are only known per integration, not per entry.
    const integration = domainToName(this.hass.localize, entry.domain);
    const entityName = (entityId: string) =>
      this.hass.states[entityId]?.attributes.friendly_name ?? entityId;
    const more = (count: number) =>
      count > MAX_LISTED
        ? html`<li>
            ${this.hass.localize(`${key}.and_more`, {
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
        ${this.hass.localize(`${key}.summary.${health.status}`)}
      </ha-alert>
      <div class="rows">
        ${this._row(
          health.state,
          this.hass.localize(
            entry.disabled_by
              ? `${key}.state.disabled`
              : `${key}.state.${entry.state}`
          ),
          health.state === "warning" || health.state === "error"
            ? html`<p>${renderConfigEntryError(this.hass, entry)}</p>`
            : nothing
        )}
        ${
          health.flows.flows.length
            ? this._row(
                health.flows.status,
                this.hass.localize(`${key}.flows`),
                html`<a href="/config/integrations/dashboard">
                  ${this.hass.localize(`${key}.flows_link`)}
                </a>`
              )
            : nothing
        }
        ${
          health.entities.total
            ? this._row(
                health.entities.status,
                this.hass.localize(`${key}.entities`, {
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
                        ${this.hass.localize(`${key}.entities_link`)}
                      </a>`
                  : nothing
              )
            : nothing
        }
        ${this._row(
          health.repairs.status,
          this.hass.localize(`${key}.repairs`, {
            count: health.repairs.issues.length,
            integration,
          }),
          health.repairs.issues.length
            ? html`<a href="/config/repairs">
                ${this.hass.localize(`${key}.repairs_link`)}
              </a>`
            : nothing
        )}
        ${this._row(
          health.logs.status,
          this.hass.localize(`${key}.logs`, {
            errors: health.logs.errors,
            warnings: health.logs.warnings,
            integration,
          }),
          health.logs.errors || health.logs.warnings
            ? html`<a
                href=${`/config/logs?search=${encodeURIComponent(entry.domain)}`}
              >
                ${this.hass.localize(`${key}.logs_link`)}
              </a>`
            : nothing
        )}
        ${
          health.setupSeconds !== undefined
            ? this._row(
                "info",
                health.setupSeconds < 0.1
                  ? this.hass.localize(`${key}.setup_time_fast`)
                  : this.hass.localize(`${key}.setup_time`, {
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

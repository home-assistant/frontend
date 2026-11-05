import type { ContextType } from "@lit/context";
import {
  mdiAlertCircle,
  mdiCancel,
  mdiCheckCircle,
  mdiCheckCircleOutline,
  mdiCircleOutline,
  mdiClockOutline,
  mdiCloseCircle,
  mdiHelpCircleOutline,
  mdiTimerSandEmpty,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import type {
  DryRunCondition,
  DryRunConditionResult,
  DryRunDetailLine,
  DryRunResult,
  DryRunTrigger,
  DryRunTriggerStatus,
} from "../../../../data/automation_dry_run";
import {
  conditionAtPath,
  dryRunAutomationConfig,
  dryRunDetailLines,
  triggerAtIndex,
} from "../../../../data/automation_dry_run";
import {
  apiContext,
  configContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../../resources/styles";
import type { AutomationDryRunDialogParams } from "./show-dialog-automation-dry-run";

const RESULT_ICONS: Record<DryRunConditionResult, string> = {
  pass: mdiCheckCircle,
  fail: mdiCloseCircle,
  error: mdiAlertCircle,
  depends_on_trigger: mdiHelpCircleOutline,
  disabled: mdiCancel,
};

const STATUS_ICONS: Record<DryRunTriggerStatus, string> = {
  in_target_state: mdiCheckCircleOutline,
  in_range: mdiCheckCircleOutline,
  not_in_target_state: mdiCircleOutline,
  not_in_range: mdiCircleOutline,
  scheduled: mdiClockOutline,
  waits_for_event: mdiTimerSandEmpty,
  disabled: mdiCancel,
  error: mdiAlertCircle,
};

const PREFIX = "ui.panel.config.automation.editor.dry_run";

@customElement("dialog-automation-dry-run")
class DialogAutomationDryRun extends DialogMixin<AutomationDryRunDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: configContext })
  private _hassConfig!: ContextType<typeof configContext>;

  // Only used for entity names, so a snapshot is enough
  @consume({ context: statesContext })
  private _states!: ContextType<typeof statesContext>;

  @state() private _result?: DryRunResult;

  @state() private _error?: string;

  @state() private _loading = false;

  connectedCallback() {
    super.connectedCallback();
    // The element is reused, so drop the result of an earlier opening
    this._result = undefined;
    this._dryRun();
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const localize = this._i18n.localize;

    return html`
      <ha-dialog
        open
        width="large"
        .headerTitle=${localize(`${PREFIX}.title`)}
        .headerSubtitle=${localize(`${PREFIX}.subtitle`)}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">
                ${localize(`${PREFIX}.failed`, { error: this._error })}
              </ha-alert>`
            : nothing
        }
        ${
          this._result
            ? this._renderResult(this._result)
            : this._loading
              ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
              : nothing
        }

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            .disabled=${this._loading}
            @click=${this._dryRun}
          >
            ${localize(`${PREFIX}.check_again`)}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderResult(result: DryRunResult) {
    const localize = this._i18n.localize;
    const enabledTriggers = result.triggers.filter(
      (trigger) => trigger.status !== "disabled"
    );

    return html`
      ${this._renderVerdict(result)}
      ${
        result.variables_error
          ? html`<ha-alert alert-type="warning">
              ${localize(`${PREFIX}.variables_error`, {
                error: result.variables_error,
              })}
            </ha-alert>`
          : nothing
      }

      <h3>${localize("ui.panel.config.automation.editor.triggers.header")}</h3>
      ${
        enabledTriggers.length
          ? nothing
          : html`<p class="secondary">${localize(`${PREFIX}.manual_only`)}</p>`
      }
      <ul>
        ${result.triggers.map((trigger) => this._renderTrigger(trigger))}
      </ul>

      <h3>
        ${localize("ui.panel.config.automation.editor.conditions.header")}
      </h3>
      ${
        result.conditions.length
          ? html`<ul>
              ${result.conditions.map((condition) =>
                this._renderCondition(condition)
              )}
            </ul>`
          : html`<p class="secondary">
              ${localize(`${PREFIX}.no_conditions`)}
            </p>`
      }
    `;
  }

  private _renderVerdict(result: DryRunResult) {
    const localize = this._i18n.localize;
    if (result.would_run) {
      return html`<ha-alert alert-type="success">
        ${localize(`${PREFIX}.verdict.would_run`)}
      </ha-alert>`;
    }
    if (result.reason === null) {
      return nothing;
    }
    return html`<ha-alert
      alert-type=${result.would_run === null ? "info" : "warning"}
    >
      ${localize(`${PREFIX}.verdict.${result.reason}`, {
        max: result.max_runs ?? "",
      })}
    </ha-alert>`;
  }

  private _renderTrigger(trigger: DryRunTrigger) {
    const localize = this._i18n.localize;
    const config = this.params!.config;
    const status =
      trigger.status === "scheduled" && trigger.next
        ? localize(`${PREFIX}.trigger_status.scheduled`, {
            time: formatDateTime(
              new Date(trigger.next),
              this._i18n.locale,
              this._hassConfig.config
            ),
          })
        : localize(`${PREFIX}.trigger_status.${trigger.status}`);

    return html`<li class=${`status-${trigger.status}`}>
      <div class="row">
        <ha-svg-icon .path=${STATUS_ICONS[trigger.status]}></ha-svg-icon>
        <span class="name">
          ${trigger.alias || this._typeLabel("triggers", trigger.trigger)}
        </span>
        <span class="status">${status}</span>
      </div>
      ${
        trigger.status === "in_target_state"
          ? html`<div class="detail secondary">
              ${localize(`${PREFIX}.state_change_note`)}
            </div>`
          : nothing
      }
      ${this._renderDetails(
        trigger.trigger,
        trigger,
        triggerAtIndex(config, trigger.idx)
      )}
    </li>`;
  }

  private _renderCondition(condition: DryRunCondition): TemplateResult {
    const localize = this._i18n.localize;
    return html`<li class=${`result-${condition.result}`}>
      <div class="row">
        <ha-svg-icon .path=${RESULT_ICONS[condition.result]}></ha-svg-icon>
        <span class="name">
          ${
            condition.alias ||
            this._typeLabel("conditions", condition.condition)
          }
        </span>
        <span class="status">
          ${localize(`${PREFIX}.condition_result.${condition.result}`)}
        </span>
      </div>
      ${this._renderDetails(
        condition.condition,
        condition,
        conditionAtPath(this.params!.config, condition.path)
      )}
      ${
        condition.conditions
          ? html`<ul>
              ${condition.conditions.map((child) => this._renderCondition(child))}
            </ul>`
          : nothing
      }
    </li>`;
  }

  private _renderDetails(
    type: string,
    node: DryRunTrigger | DryRunCondition,
    config: Parameters<typeof dryRunDetailLines>[2]
  ) {
    const localize = this._i18n.localize;
    const lines = dryRunDetailLines(type, node.details, config);
    return html`
      ${lines.map(
        (line) => html`<div class="detail">${this._formatLine(line)}</div>`
      )}
      ${
        node.error
          ? html`<div class="detail error">${node.error}</div>`
          : nothing
      }
      ${(node.template_errors ?? []).map(
        (error) =>
          html`<div class="detail error">
            ${localize(`${PREFIX}.detail.template_error`, { error })}
          </div>`
      )}
    `;
  }

  private _formatLine(line: DryRunDetailLine): string {
    const localize = this._i18n.localize;
    switch (line.type) {
      case "state":
        return line.wanted === undefined
          ? localize(`${PREFIX}.detail.state_only`, {
              entity: this._entityName(line.entityId),
              actual: String(line.actual),
            })
          : localize(`${PREFIX}.detail.state`, {
              entity: this._entityName(line.entityId),
              actual: String(line.actual),
              wanted: String(line.wanted),
            });
      case "state_since":
        return localize(
          `${PREFIX}.detail.${line.ok ? "state_since" : "state_not_since"}`,
          {
            entity: this._entityName(line.entityId),
            actual: String(line.actual),
            since: formatDateTime(
              new Date(line.since),
              this._i18n.locale,
              this._hassConfig.config
            ),
          }
        );
      case "numeric":
        return localize(`${PREFIX}.detail.numeric`, {
          entity: this._entityName(line.entityId),
          actual: String(line.actual),
          range:
            line.above !== undefined && line.below !== undefined
              ? localize(`${PREFIX}.detail.range_between`, {
                  above: line.above,
                  below: line.below,
                })
              : line.above !== undefined
                ? localize(`${PREFIX}.detail.range_above`, {
                    above: line.above,
                  })
                : line.below !== undefined
                  ? localize(`${PREFIX}.detail.range_below`, {
                      below: line.below,
                    })
                  : "-",
        });
      case "time":
        return localize(`${PREFIX}.detail.time`, line);
      case "weekday":
        return localize(`${PREFIX}.detail.weekday`, {
          now: line.now,
          wanted: line.wanted.join(", "),
        });
      case "template_entities":
        return localize(`${PREFIX}.detail.template_entities`, {
          entities: line.entities
            .map((entityId) => this._entityName(entityId))
            .join(", "),
        });
      case "message":
        return line.message;
    }
    return "";
  }

  private _entityName(entityId: string | undefined): string {
    if (!entityId) {
      return this._i18n.localize(`${PREFIX}.detail.entity`);
    }
    const stateObj = this._states[entityId];
    return stateObj ? computeStateName(stateObj) : entityId;
  }

  private _typeLabel(kind: "triggers" | "conditions", type: string) {
    return (
      this._i18n.localize(
        `ui.panel.config.automation.editor.${kind}.type.${type}.label` as LocalizeKeys
      ) || type
    );
  }

  private async _dryRun() {
    if (!this.params) {
      return;
    }
    this._loading = true;
    this._error = undefined;
    try {
      this._result = await dryRunAutomationConfig(
        this._api.callWS,
        this.params.config
      );
    } catch (err: any) {
      this._result = undefined;
      this._error = err?.message ?? String(err);
    } finally {
      this._loading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --ha-dialog-header-white-space: normal;
          --ha-dialog-header-title-height: auto;
        }
        h3 {
          margin: var(--ha-space-4) 0 var(--ha-space-2);
          font-size: var(--ha-font-size-l);
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        li ul {
          margin-inline-start: var(--ha-space-3);
          padding-inline-start: var(--ha-space-3);
          border-inline-start: 1px solid var(--divider-color);
        }
        li {
          padding: var(--ha-space-1) 0;
        }
        .row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .name {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .status {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          text-align: end;
        }
        .detail {
          margin-inline-start: calc(24px + var(--ha-space-2));
          font-size: var(--ha-font-size-s);
          overflow-wrap: anywhere;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        .error {
          color: var(--error-color);
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-4);
        }
        ha-svg-icon {
          flex: none;
          color: var(--secondary-text-color);
        }
        .result-pass > .row ha-svg-icon,
        .status-in_target_state > .row ha-svg-icon,
        .status-in_range > .row ha-svg-icon {
          color: var(--success-color);
        }
        .result-fail > .row ha-svg-icon {
          color: var(--error-color);
        }
        .result-error > .row ha-svg-icon,
        .status-error > .row ha-svg-icon {
          color: var(--warning-color);
        }
        .result-disabled > .row,
        .status-disabled > .row {
          opacity: 0.6;
        }
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-automation-dry-run": DialogAutomationDryRun;
  }
}

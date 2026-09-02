import { consume } from "@lit/context";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import { dump } from "js-yaml";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import type { Trigger } from "../../data/automation";
import { migrateAutomationTrigger } from "../../data/automation";
import { describeCondition, describeTrigger } from "../../data/automation_i18n";
import type { ConditionDescriptions } from "../../data/condition";
import {
  conditionDescriptionsContext,
  fullEntitiesContext,
  labelsContext,
  manifestsContext,
  triggerDescriptionsContext,
} from "../../data/context";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import type { DomainManifestLookup } from "../../data/integration";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import type { LogbookEntry } from "../../data/logbook";
import { describeAction } from "../../data/script_i18n";
import type {
  ActionTraceStep,
  ChooseActionTraceStep,
  TraceExtended,
} from "../../data/trace";
import type { TargetSelector } from "../../data/selector";
import { getDataFromPath, isTriggerPath } from "../../data/trace";
import type { TriggerDescriptions } from "../../data/trigger";
import { getDeviceTarget } from "../../panels/config/automation/target/get_device_target";
import { getEntityTarget } from "../../panels/config/automation/target/get_entity_target";
import "../../panels/config/automation/target/ha-automation-row-targets";
import "../../panels/logbook/ha-logbook-renderer";
import type { HomeAssistant } from "../../types";
import "../ha-alert";
import "../ha-code-editor";
import "../ha-icon-button";
import "../ha-tab-group";
import "../ha-tab-group-tab";
import "./hat-logbook-note";
import type { NodeInfo } from "./hat-script-graph";

const TRACE_PATH_TABS = [
  "step_config",
  "changed_variables",
  "logbook",
] as const;

// A repeat keeps only its last iterations, so the array index is not the real
// one. Use the recorded repeat.index when we have it.
const iterationNumber = (trace: ActionTraceStep, index: number): number =>
  (trace.changed_variables?.repeat as { index?: number } | undefined)?.index ??
  index + 1;

@customElement("ha-trace-path-details")
export class HaTracePathDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public trace!: TraceExtended;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  @property({ attribute: false }) public selected!: NodeInfo;

  @property({ attribute: false })
  public renderedNodes: Record<string, any> = {};

  @property({ attribute: false }) public trackedNodes!: Record<string, any>;

  @state() private _view: (typeof TRACE_PATH_TABS)[number] = "step_config";

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] = [];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelReg!: LabelRegistryEntry[];

  @state()
  @consume({ context: manifestsContext, subscribe: true })
  private _manifests?: DomainManifestLookup;

  @state()
  @consume({ context: triggerDescriptionsContext, subscribe: true })
  private _triggerDescriptions?: TriggerDescriptions;

  @state()
  @consume({ context: conditionDescriptionsContext, subscribe: true })
  private _conditionDescriptions?: ConditionDescriptions;

  protected render(): TemplateResult {
    return html`
      <div class="padded-box trace-info">
        ${this._renderNotTriggeredNotice()} ${this._renderSelectedTraceInfo()}
      </div>

      <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
        ${TRACE_PATH_TABS.map(
          (view) => html`
            <ha-tab-group-tab
              slot="nav"
              .active=${this._view === view}
              .panel=${view}
            >
              ${this.hass!.localize(
                `ui.panel.config.automation.trace.tabs.${view}`
              )}
            </ha-tab-group-tab>
          `
        )}
      </ha-tab-group>
      ${
        this._view === "step_config"
          ? this._renderSelectedConfig()
          : this._view === "changed_variables"
            ? this._renderChangedVars()
            : this._renderLogbook()
      }
    `;
  }

  private _renderNotTriggeredNotice() {
    if (
      !this.trace.not_triggered ||
      !this.selected?.path ||
      !isTriggerPath(this.selected.path) ||
      !(this.selected.path in this.trace.trace)
    ) {
      return nothing;
    }
    return html`<ha-alert alert-type="info">
      ${this.hass!.localize(
        "ui.panel.config.automation.trace.path.not_triggered"
      )}
    </ha-alert>`;
  }

  private _renderSelectedTraceInfo() {
    const paths = this.trace.trace;

    if (!this.selected?.path) {
      return this.hass!.localize(
        "ui.panel.config.automation.trace.path.choose"
      );
    }

    // HACK: default choice node is not part of paths. We filter them out here by checking parent.
    const pathParts = this.selected.path.split("/");
    if (pathParts[pathParts.length - 1] === "default") {
      const parentTraceInfo = paths[
        pathParts.slice(0, pathParts.length - 1).join("/")
      ] as ChooseActionTraceStep[];

      if (parentTraceInfo && parentTraceInfo[0]?.result?.choice === "default") {
        return this.hass!.localize(
          "ui.panel.config.automation.trace.path.default_action_executed"
        );
      }
    }

    if (!(this.selected.path in paths)) {
      return this.hass!.localize(
        "ui.panel.config.automation.trace.path.no_further_execution"
      );
    }

    const parts: TemplateResult[][] = [];

    let active = false;

    for (const curPath of Object.keys(this.trace.trace)) {
      // Include all trace results until the next rendered node.
      // Rendered nodes also include non-chosen choose paths.
      if (active) {
        if (curPath in this.renderedNodes) {
          break;
        }
      } else if (curPath === this.selected.path) {
        active = true;
      } else {
        continue;
      }

      const data: ActionTraceStep[] = paths[curPath];

      // Extract details from this.selected.config child properties used to add 'alias' (to headline), describeCondition and 'entity_id' (to result)
      const nestPath = curPath
        .substring(this.selected.path.length + 1)
        .split("/");
      let currentDetail = this.selected.config;
      for (const part of nestPath) {
        if (!["undefined", "string"].includes(typeof currentDetail[part])) {
          currentDetail = currentDetail[part];
        }
      }

      parts.push(
        data.map((trace, idx) => {
          const {
            path,
            timestamp,
            result,
            error,
            template_errors,
            changed_variables,
            ...rest
          } = trace as any;

          if (result?.enabled === false) {
            return html`${this.hass!.localize(
              "ui.panel.config.automation.trace.path.disabled_step"
            )}`;
          }

          return html`
            ${this._renderStepHeading(curPath, currentDetail, pathParts)}
            ${
              data.length === 1
                ? nothing
                : html`<h3>
                    ${this.hass!.localize(
                      "ui.panel.config.automation.trace.path.iteration",
                      { number: iterationNumber(trace, idx) }
                    )}
                  </h3>`
            }
            ${this._renderNestedCondition(curPath, currentDetail)}
            ${this.hass!.localize(
              "ui.panel.config.automation.trace.path.executed",
              {
                time: formatDateTimeWithSeconds(
                  new Date(timestamp),
                  this.hass.locale,
                  this.hass.config
                ),
              }
            )}
            <br />
            ${
              error
                ? html`<div class="error">
                    ${this.hass!.localize(
                      "ui.panel.config.automation.trace.path.error",
                      {
                        error: error,
                      }
                    )}
                  </div>`
                : nothing
            }
            ${
              template_errors?.length
                ? html`<div class="error">
                    ${this.hass!.localize(
                      "ui.panel.config.automation.trace.path.template_errors"
                    )}
                    <ul>
                      ${template_errors.map(
                        (templateError: string) =>
                          html`<li>${templateError}</li>`
                      )}
                    </ul>
                  </div>`
                : nothing
            }
            ${
              result
                ? html`${this.hass!.localize(
                      "ui.panel.config.automation.trace.path.result"
                    )}
                    <pre>${dump(result)}</pre>`
                : nothing
            }
            ${
              Object.keys(rest).length === 0
                ? nothing
                : html`<pre>${dump(rest)}</pre>`
            }
            ${
              currentDetail.entity_id &&
              curPath
                .substring(this.selected.path.length + 1)
                .includes("entity_id")
                ? html`<pre>entity: ${currentDetail.entity_id}</pre>`
                : nothing
            }
          `;
        })
      );
    }

    return parts;
  }

  private _renderStepHeading(
    curPath: string,
    currentDetail: any,
    pathParts: string[]
  ) {
    if (curPath !== this.selected.path) {
      return html`<div class="heading">
        <h2>${curPath.substring(this.selected.path.length + 1)}</h2>
      </div>`;
    }

    const selectedType = this.selected.type;

    const description = currentDetail.alias
      ? currentDetail.alias
      : selectedType === "trigger"
        ? describeTrigger(
            migrateAutomationTrigger({ ...currentDetail }) as Trigger,
            this.hass,
            this._entityReg
          )
        : selectedType === "condition"
          ? describeCondition(currentDetail, this.hass, this._entityReg)
          : selectedType === "action"
            ? describeAction(
                this.hass,
                this._entityReg,
                currentDetail,
                undefined,
                false,
                this._manifests
              )
            : selectedType === "chooseOption"
              ? this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.choose.option",
                  { number: pathParts[pathParts.length - 1] }
                )
              : undefined;

    if (description === undefined) {
      return nothing;
    }

    return html`<div class="heading">
      <h2>${description}</h2>
      ${this._renderTargets(currentDetail, selectedType)}
    </div>`;
  }

  private _renderNestedCondition(curPath: string, currentDetail: any) {
    if (
      !curPath.substring(this.selected.path.length + 1).includes("condition")
    ) {
      return nothing;
    }

    return html`<div class="nested-condition">
      ${describeCondition(currentDetail, this.hass, this._entityReg)}
      ${this._renderTargets(currentDetail, "condition", "s")}
    </div>`;
  }

  private _renderTargets(
    config: any,
    type: NodeInfo["type"],
    size: "s" | "m" = "m"
  ) {
    const target = this._getTarget(config, type);
    if (!target) {
      return nothing;
    }
    const targetSpec = this._getTargetSelector(config, type);
    return html`<div class="targets">
      <ha-automation-row-targets
        .target=${target}
        .selector=${targetSpec ? { target: targetSpec } : undefined}
        .size=${size}
        interactive
      ></ha-automation-row-targets>
    </div>`;
  }

  private _getTargetSelector(
    config: any,
    type: NodeInfo["type"]
  ): TargetSelector["target"] | undefined {
    if (type === "trigger") {
      return this._triggerDescriptions?.[config.trigger]?.target;
    }
    if (type === "condition") {
      return this._conditionDescriptions?.[config.condition]?.target;
    }
    if (type === "action" && typeof config.action === "string") {
      const [domain, service] = config.action.split(".", 2);
      return this.hass.services?.[domain]?.[service]?.target;
    }
    return undefined;
  }

  private _getTarget(
    config: any,
    type: NodeInfo["type"]
  ): HassServiceTarget | undefined {
    if (config.target) {
      return config.target;
    }
    if (type === "trigger" || type === "condition") {
      const element = type === "trigger" ? config.trigger : config.condition;
      if (element === "state" || element === "numeric_state") {
        return getEntityTarget(config.entity_id);
      }
      if (element === "device") {
        return getDeviceTarget(config.device_id);
      }
      return undefined;
    }
    if (type === "action") {
      return config.entity_id
        ? getEntityTarget(config.entity_id)
        : getDeviceTarget(config.device_id);
    }
    return undefined;
  }

  private _renderSelectedConfig() {
    if (!this.selected?.path) {
      return nothing;
    }
    const config = getDataFromPath(this.trace!.config, this.selected.path);
    return config
      ? html`<ha-code-editor
          .value=${dump(config).trimEnd()}
          read-only
          dir="ltr"
        ></ha-code-editor>`
      : this.hass!.localize(
          "ui.panel.config.automation.trace.path.unable_to_find_config"
        );
  }

  private _renderChangedVars() {
    const paths = this.trace.trace;
    const data: ActionTraceStep[] = paths[this.selected.path];

    if (data === undefined) {
      return html`<div class="padded-box">
        ${this.hass!.localize(
          "ui.panel.config.automation.trace.path.step_not_executed"
        )}
      </div>`;
    }

    return html`
      <div class="padded-box">
        ${data.map(
          (trace, idx) => html`
            ${
              data.length > 1
                ? html`<p>
                    ${this.hass!.localize(
                      "ui.panel.config.automation.trace.path.iteration",
                      { number: iterationNumber(trace, idx) }
                    )}
                  </p>`
                : ""
            }
            ${
              Object.keys(trace.changed_variables || {}).length === 0
                ? this.hass!.localize(
                    "ui.panel.config.automation.trace.path.no_variables_changed"
                  )
                : html`<ha-code-editor
                    read-only
                    dir="ltr"
                    .value=${dump(trace.changed_variables).trimEnd()}
                  ></ha-code-editor>`
            }
          `
        )}
      </div>
    `;
  }

  private _renderLogbook() {
    const paths = this.trace.trace;
    const startTrace = paths[this.selected.path];
    const trackedPaths = Object.keys(this.trackedNodes);
    const index = trackedPaths.indexOf(this.selected.path);

    if (index === -1) {
      return html`<div class="padded-box">
        ${this.hass!.localize(
          "ui.panel.config.automation.trace.path.step_not_executed"
        )}
      </div>`;
    }

    let entries: LogbookEntry[];

    if (index === trackedPaths.length - 1) {
      // it's the last entry. Find all logbook entries after start.
      const startTime = new Date(startTrace[0].timestamp);
      const idx = this.logbookEntries.findIndex(
        (entry) => new Date(entry.when * 1000) >= startTime
      );
      if (idx === -1) {
        entries = [];
      } else {
        entries = this.logbookEntries.slice(idx);
      }
    } else {
      const nextTrace = paths[trackedPaths[index + 1]];

      const startTime = new Date(startTrace[0].timestamp);
      const endTime = new Date(nextTrace[0].timestamp);

      entries = [];

      for (const entry of this.logbookEntries || []) {
        const entryDate = new Date(entry.when * 1000);
        if (entryDate >= startTime) {
          if (entryDate < endTime) {
            entries.push(entry);
          } else {
            // All following entries are no longer valid.
            break;
          }
        }
      }
    }

    return entries.length
      ? html`
          <ha-logbook-renderer
            .hass=${this.hass}
            .entries=${entries}
            .narrow=${this.narrow}
            no-detail
          ></ha-logbook-renderer>
          <hat-logbook-note .domain=${this.trace.domain}></hat-logbook-note>
        `
      : html`<div class="padded-box">
          ${this.hass!.localize(
            "ui.panel.config.automation.trace.path.no_logbook_entries"
          )}
        </div>`;
  }

  private _handleTabChanged(ev: CustomEvent) {
    this._view = ev.detail.name as typeof this._view;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .padded-box {
          margin: 16px;
        }

        :host(:not([narrow])) .trace-info {
          min-height: 250px;
        }

        .heading {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--ha-space-2);
          margin: var(--ha-space-4) 0;
        }

        .heading h2 {
          margin: 0;
        }

        .heading .targets {
          margin-top: 0;
        }

        .targets {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--ha-space-2);
          margin-top: var(--ha-space-2);
        }

        .nested-condition {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--ha-space-2);
          margin-bottom: var(--ha-space-2);
        }

        .nested-condition .targets {
          margin-top: 0;
        }

        pre {
          margin: 0;
        }

        .error {
          color: var(--error-color);
        }

        .error ul {
          margin: var(--ha-space-1) 0;
          padding-left: var(--ha-space-6);
        }

        ha-tab-group {
          background-color: var(--primary-background-color);
          border-top: 1px solid var(--divider-color);
          border-bottom: 1px solid var(--divider-color);
        }

        ha-tab-group-tab::part(base) {
          padding: 2px 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trace-path-details": HaTracePathDetails;
  }
}

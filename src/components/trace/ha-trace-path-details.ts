import { consume } from "@lit/context";
import { dump } from "js-yaml";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import type { Trigger } from "../../data/automation";
import { migrateAutomationTrigger } from "../../data/automation";
import { describeCondition, describeTrigger } from "../../data/automation_i18n";
import { fullEntitiesContext, labelsContext } from "../../data/context";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import type { LogbookEntry } from "../../data/logbook";
import { describeAction } from "../../data/script_i18n";
import type {
  ActionTraceStep,
  ChooseActionTraceStep,
  TraceExtended,
} from "../../data/trace";
import { getDataFromPath } from "../../data/trace";
import "../../panels/logbook/ha-logbook-renderer";
import type { HomeAssistant } from "../../types";
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

  protected render(): TemplateResult {
    return html`
      <div class="padded-box trace-info">
        ${this._renderSelectedTraceInfo()}
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
      ${this._view === "step_config"
        ? this._renderSelectedConfig()
        : this._view === "changed_variables"
          ? this._renderChangedVars()
          : this._renderLogbook()}
    `;
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
          const { path, timestamp, result, error, changed_variables, ...rest } =
            trace as any;

          if (result?.enabled === false) {
            return html`${this.hass!.localize(
              "ui.panel.config.automation.trace.path.disabled_step"
            )}`;
          }

          const selectedType = this.selected.type;

          return html`
            ${curPath === this.selected.path
              ? currentDetail.alias
                ? html`<h2>${currentDetail.alias}</h2>`
                : selectedType === "trigger"
                  ? html`<h2>
                      ${describeTrigger(
                        migrateAutomationTrigger({
                          ...currentDetail,
                        }) as Trigger,
                        this.hass,
                        this._entityReg
                      )}
                    </h2>`
                  : selectedType === "condition"
                    ? html`<h2>
                        ${describeCondition(
                          currentDetail,
                          this.hass,
                          this._entityReg
                        )}
                      </h2>`
                    : selectedType === "action"
                      ? html`<h2>
                          ${describeAction(
                            this.hass,
                            this._entityReg,
                            currentDetail
                          )}
                        </h2>`
                      : selectedType === "chooseOption"
                        ? html`<h2>
                            ${this.hass.localize(
                              "ui.panel.config.automation.editor.actions.type.choose.option",
                              { number: pathParts[pathParts.length - 1] }
                            )}
                          </h2>`
                        : nothing
              : html`<h2>
                  ${curPath.substring(this.selected.path.length + 1)}
                </h2>`}
            ${data.length === 1
              ? nothing
              : html`<h3>
                  ${this.hass!.localize(
                    "ui.panel.config.automation.trace.path.iteration",
                    { number: idx + 1 }
                  )}
                </h3>`}
            ${curPath
              .substring(this.selected.path.length + 1)
              .includes("condition")
              ? html`[${describeCondition(
                    currentDetail,
                    this.hass,
                    this._entityReg
                  )}]<br />`
              : nothing}
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
            ${error
              ? html`<div class="error">
                  ${this.hass!.localize(
                    "ui.panel.config.automation.trace.path.error",
                    {
                      error: error,
                    }
                  )}
                </div>`
              : nothing}
            ${result
              ? html`${this.hass!.localize(
                    "ui.panel.config.automation.trace.path.result"
                  )}
                  <pre>${dump(result)}</pre>`
              : nothing}
            ${Object.keys(rest).length === 0
              ? nothing
              : html`<pre>${dump(rest)}</pre>`}
            ${currentDetail.entity_id &&
            curPath
              .substring(this.selected.path.length + 1)
              .includes("entity_id")
              ? html`<pre>entity: ${currentDetail.entity_id}</pre>`
              : nothing}
          `;
        })
      );
    }

    return parts;
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
            ${data.length > 1
              ? html`<p>
                  ${this.hass!.localize(
                    "ui.panel.config.automation.trace.path.iteration",
                    { number: idx + 1 }
                  )}
                </p>`
              : ""}
            ${Object.keys(trace.changed_variables || {}).length === 0
              ? this.hass!.localize(
                  "ui.panel.config.automation.trace.path.no_variables_changed"
                )
              : html`<ha-code-editor
                  read-only
                  dir="ltr"
                  .value=${dump(trace.changed_variables).trimEnd()}
                ></ha-code-editor>`}
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
            relative-time
            .hass=${this.hass}
            .entries=${entries}
            .narrow=${this.narrow}
          ></ha-logbook-renderer>
          <hat-logbook-note
            .hass=${this.hass}
            .domain=${this.trace.domain}
          ></hat-logbook-note>
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

        pre {
          margin: 0;
        }

        .error {
          color: var(--error-color);
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

import { dump } from "js-yaml";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import "../ha-code-editor";
import "../ha-icon-button";
import "./hat-logbook-note";
import { LogbookEntry } from "../../data/logbook";
import {
  ActionTraceStep,
  ChooseActionTraceStep,
  getDataFromPath,
  TraceExtended,
} from "../../data/trace";
import "../../panels/logbook/ha-logbook-renderer";
import { traceTabStyles } from "./trace-tab-styles";
import { HomeAssistant } from "../../types";
import type { NodeInfo } from "./hat-script-graph";

const TRACE_PATH_TABS = [
  "step_config",
  "changed_variables",
  "logbook",
] as const;

@customElement("ha-trace-path-details")
export class HaTracePathDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ attribute: false }) public trace!: TraceExtended;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  @property({ attribute: false }) public selected!: NodeInfo;

  @property() public renderedNodes: Record<string, any> = {};

  @property() public trackedNodes!: Record<string, any>;

  @state() private _view: (typeof TRACE_PATH_TABS)[number] = "step_config";

  protected render(): TemplateResult {
    return html`
      <div class="padded-box trace-info">
        ${this._renderSelectedTraceInfo()}
      </div>

      <div class="tabs top">
        ${TRACE_PATH_TABS.map(
          (view) => html`
            <button
              .view=${view}
              class=${classMap({ active: this._view === view })}
              @click=${this._showTab}
            >
              ${this.hass!.localize(
                `ui.panel.config.automation.trace.tabs.${view}`
              )}
            </button>
          `
        )}
      </div>
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

      parts.push(
        data.map((trace, idx) => {
          const { path, timestamp, result, error, changed_variables, ...rest } =
            trace as any;

          if (result?.enabled === false) {
            return html`${this.hass!.localize(
              "ui.panel.config.automation.trace.path.disabled_step"
            )}`;
          }

          return html`
            ${curPath === this.selected.path
              ? ""
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
            ${result
              ? html`${this.hass!.localize(
                    "ui.panel.config.automation.trace.path.result"
                  )}
                  <pre>${dump(result)}</pre>`
              : error
                ? html`<div class="error">
                    ${this.hass!.localize(
                      "ui.panel.config.automation.trace.path.error",
                      {
                        error: error,
                      }
                    )}
                  </div>`
                : nothing}
            ${Object.keys(rest).length === 0
              ? nothing
              : html`<pre>${dump(rest)}</pre>`}
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
          readOnly
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
              : html`<pre>${dump(trace.changed_variables).trimEnd()}</pre>`}
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
          <hat-logbook-note .domain=${this.trace.domain}></hat-logbook-note>
        `
      : html`<div class="padded-box">
          ${this.hass!.localize(
            "ui.panel.config.automation.trace.path.no_logbook_entries"
          )}
        </div>`;
  }

  private _showTab(ev) {
    this._view = ev.target.view;
  }

  static get styles(): CSSResultGroup {
    return [
      traceTabStyles,
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trace-path-details": HaTracePathDetails;
  }
}

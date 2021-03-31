import { safeDump } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import {
  ActionTraceStep,
  AutomationTraceExtended,
  ChooseActionTraceStep,
  getDataFromPath,
} from "../../../../data/trace";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-code-editor";
import type { NodeInfo } from "../../../../components/trace/hat-graph";
import { HomeAssistant } from "../../../../types";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { LogbookEntry } from "../../../../data/logbook";
import { traceTabStyles } from "./styles";
import { classMap } from "lit-html/directives/class-map";

@customElement("ha-automation-trace-path-details")
export class HaAutomationTracePathDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() private selected!: NodeInfo;

  @property() public trace!: AutomationTraceExtended;

  @property() public logbookEntries!: LogbookEntry[];

  @property() public trackedNodes!: Record<string, any>;

  @internalProperty() private _view:
    | "config"
    | "changed_variables"
    | "logbook" = "config";

  protected render(): TemplateResult {
    return html`
      <div class="padded-box trace-info">
        ${this._renderSelectedTraceInfo()}
      </div>

      <div class="tabs top">
        ${[
          ["config", "Step Config"],
          ["changed_variables", "Changed Variables"],
          ["logbook", "Related logbook entries"],
        ].map(
          ([view, label]) => html`
            <div
              .view=${view}
              class=${classMap({ active: this._view === view })}
              @click=${this._showTab}
            >
              ${label}
            </div>
          `
        )}
      </div>
      ${this._view === "config"
        ? this._renderSelectedConfig()
        : this._view === "changed_variables"
        ? this._renderChangedVars()
        : this._renderLogbook()}
    `;
  }

  private _renderSelectedTraceInfo() {
    const paths = this.trace.trace;

    if (!this.selected?.path) {
      return "Select a node on the left for more information.";
    }

    // HACK: default choice node is not part of paths. We filter them out here by checking parent.
    const pathParts = this.selected.path.split("/");
    if (pathParts[pathParts.length - 1] === "default") {
      const parentTraceInfo = paths[
        pathParts.slice(0, pathParts.length - 1).join("/")
      ] as ChooseActionTraceStep[];

      if (parentTraceInfo && parentTraceInfo[0]?.result?.choice === "default") {
        return "The default node was executed because no choices matched.";
      }
    }

    if (!(this.selected.path in paths)) {
      return "This node was not executed and so no further trace information is available.";
    }

    const data: ActionTraceStep[] = paths[this.selected.path];

    return data.map((trace, idx) => {
      const {
        path,
        timestamp,
        result,
        changed_variables,
        ...rest
      } = trace as any;

      return html`
        ${data.length === 1 ? "" : html`<h3>Iteration ${idx + 1}</h3>`}
        Executed:
        ${formatDateTimeWithSeconds(new Date(timestamp), this.hass.locale)}<br />
        ${result
          ? html`Result:
              <pre>${safeDump(result)}</pre>`
          : ""}
        ${Object.keys(rest).length === 0
          ? ""
          : html`<pre>${safeDump(rest)}</pre>`}
      `;
    });
  }

  private _renderSelectedConfig() {
    if (!this.selected?.path) {
      return "";
    }
    const config = getDataFromPath(this.trace!.config, this.selected.path);
    return config
      ? html`<ha-code-editor
          .value=${safeDump(config).trimRight()}
          readOnly
        ></ha-code-editor>`
      : "Unable to find config";
  }

  private _renderChangedVars() {
    const paths = this.trace.trace;
    const data: ActionTraceStep[] = paths[this.selected.path];

    return html`
      <div class="padded-box">
        ${data.map(
          (trace, idx) => html`
            ${idx > 0 ? html`<p>Iteration ${idx + 1}</p>` : ""}
            ${Object.keys(trace.changed_variables || {}).length === 0
              ? "No variables changed"
              : html`<pre>
${safeDump(trace.changed_variables).trimRight()}</pre
                >`}
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
      return html`<div class="padded-box">Node not tracked.</div>`;
    }

    let entries: LogbookEntry[];

    if (index === trackedPaths.length - 1) {
      // it's the last entry. Find all logbook entries after start.
      const startTime = new Date(startTrace[0].timestamp);
      const idx = this.logbookEntries.findIndex(
        (entry) => new Date(entry.when) >= startTime
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
        const entryDate = new Date(entry.when);
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

    return html`<div class="padded-box">
      ${entries.map(
        (entry) =>
          html`${entry.name} (${entry.entity_id})
            ${entry.message || `turned ${entry.state}`}<br />`
      )}
    </div>`;
  }

  private _showTab(ev) {
    this._view = ev.target.view;
  }

  static get styles(): CSSResult[] {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace-path-details": HaAutomationTracePathDetails;
  }
}

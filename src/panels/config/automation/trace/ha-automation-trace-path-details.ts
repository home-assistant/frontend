import { safeDump } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import {
  ActionTrace,
  AutomationTraceExtended,
  ChooseActionTrace,
  getDataFromPath,
} from "../../../../data/trace";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-code-editor";
import type { NodeInfo } from "../../../../components/trace/hat-graph";
import { HomeAssistant } from "../../../../types";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { LogbookEntry } from "../../../../data/logbook";

@customElement("ha-automation-trace-path-details")
export class HaAutomationTracePathDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() private selected?: NodeInfo;

  @property() public trace!: AutomationTraceExtended;

  @property() public logbookEntries?: LogbookEntry[];

  protected render(): TemplateResult {
    return html`
      ${this._renderSelectedTraceInfo()} ${this._renderSelectedConfig()}
    `;
  }

  private _getPaths() {
    if (!this.selected?.path) {
      return {};
    }
    return this.selected.path.split("/")[0] === "condition"
      ? this.trace!.condition_trace
      : this.trace!.action_trace;
  }

  private _renderSelectedTraceInfo() {
    const paths = this._getPaths();

    if (!this.selected?.path) {
      return "Select a node on the left for more information.";
    }

    // HACK: default choice node is not part of paths. We filter them out here by checking parent.
    const pathParts = this.selected.path.split("/");
    if (pathParts[pathParts.length - 1] === "default") {
      const parentTraceInfo = paths[
        pathParts.slice(0, pathParts.length - 1).join("/")
      ] as ChooseActionTrace[];

      if (parentTraceInfo && parentTraceInfo[0]?.result?.choice === "default") {
        return "The default node was executed because no choices matched.";
      }
    }

    if (!(this.selected.path in paths)) {
      return "This node was not executed and so no further trace information is available.";
    }

    const data: ActionTrace[] = paths[this.selected.path];

    return html`
      <div class="trace">
        ${data.map((trace, idx) => {
          const {
            path,
            timestamp,
            result,
            changed_variables,
            ...rest
          } = trace as any;

          return html`
            ${idx === 0 ? "" : `<p>Iteration ${idx + 1}</p>`} Executed:
            ${formatDateTimeWithSeconds(
              new Date(timestamp),
              this.hass.language
            )}<br />
            ${result
              ? html`Result:
                  <pre>${safeDump(result)}</pre>`
              : ""}
            ${Object.keys(rest).length === 0
              ? ""
              : html`<pre>${safeDump(rest)}</pre>`}
          `;
        })}
      </div>
    `;
  }

  private _renderSelectedConfig() {
    if (!this.selected?.path) {
      return "";
    }
    const config = getDataFromPath(this.trace!.config, this.selected.path);
    return html`
      <div class="config">
        <h2>Config</h2>
        ${config
          ? html`<ha-code-editor
              .value=${safeDump(config)}
              readOnly
            ></ha-code-editor>`
          : "Unable to find config"}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace-path-details": HaAutomationTracePathDetails;
  }
}

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import {
  ActionTrace,
  AutomationTraceExtended,
  getConfigFromPath,
} from "../../data/automation_debug";
import { HomeAssistant } from "../../types";
import "./ha-timeline";
import {
  mdiCheckCircleOutline,
  mdiCircle,
  mdiCircleOutline,
  mdiPauseCircleOutline,
  mdiRecordCircleOutline,
  mdiStopCircleOutline,
} from "@mdi/js";
import { LogbookEntry } from "../../data/logbook";

const pathToName = (path: string) => path.split("/").join(" ");

@customElement("hat-trace")
export class HaAutomationTracer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) private trace?: AutomationTraceExtended;

  @property({ attribute: false }) private logbookEntries?: LogbookEntry[];

  protected render(): TemplateResult {
    if (!this.trace) {
      return html``;
    }
    const entries = [
      html`
        <ha-timeline .icon=${mdiCircle}>
          Triggered by the ${this.trace.variables.trigger.description} at
          ${formatDateTimeWithSeconds(
            new Date(this.trace.timestamp.start),
            this.hass.language
          )}
        </ha-timeline>
      `,
    ];

    if (this.trace.condition_trace) {
      for (const [path, value] of Object.entries(this.trace.condition_trace)) {
        entries.push(html`
          <ha-timeline
            ?lastItem=${!value[0].result.result}
            class="condition"
            .icon=${value[0].result.result
              ? mdiCheckCircleOutline
              : mdiStopCircleOutline}
          >
            ${getConfigFromPath(this.trace!.config, path).alias ||
            pathToName(path)}
            ${value[0].result.result ? "passed" : "failed"}
          </ha-timeline>
        `);
      }
    }

    if (this.trace.action_trace && this.logbookEntries) {
      const actionTraces = Object.entries(this.trace.action_trace);

      let logbookIndex = 0;
      let actionTraceIndex = 0;

      while (
        logbookIndex < this.logbookEntries.length &&
        actionTraceIndex < actionTraces.length
      ) {
        // Find next item.

        // Skip the "automation got triggered item"
        if (
          logbookIndex === 0 &&
          this.logbookEntries[0].domain === "automation"
        ) {
          logbookIndex++;
          continue;
        }

        // Find next item time-wise.
        const logbookItem = this.logbookEntries[logbookIndex];
        const actionTrace = actionTraces[actionTraceIndex];

        if (
          new Date(logbookItem.when) > new Date(actionTrace[1][0].timestamp)
        ) {
          actionTraceIndex++;
          entries.push(this._renderActionTrace(...actionTrace));
        } else {
          logbookIndex++;
          entries.push(this._renderLogbookEntry(logbookItem));
        }
      }

      // Append all leftover items
      while (logbookIndex < this.logbookEntries.length) {
        entries.push(
          this._renderLogbookEntry(this.logbookEntries[logbookIndex])
        );
        logbookIndex++;
      }

      while (actionTraceIndex < actionTraces.length) {
        entries.push(
          this._renderActionTrace(...actionTraces[actionTraceIndex])
        );
        actionTraceIndex++;
      }
    }

    // null means it was stopped by a condition
    if (this.trace.last_action !== null) {
      entries.push(html`
        <ha-timeline
          lastItem
          .icon=${this.trace.timestamp.finish
            ? mdiCircle
            : mdiPauseCircleOutline}
        >
          ${this.trace.timestamp.finish
            ? html`Finished at
              ${formatDateTimeWithSeconds(
                new Date(this.trace.timestamp.finish),
                this.hass.language
              )}
              (runtime:
              ${Math.round(
                // @ts-expect-error
                (new Date(this.trace.timestamp.finish!) -
                  // @ts-expect-error
                  new Date(this.trace.timestamp.start)) /
                  1000,
                1
              )}
              seconds)`
            : "Still running"}
        </ha-timeline>
      `);
    }

    return html`${entries}`;
  }

  private _renderLogbookEntry(entry: LogbookEntry) {
    return html`
      <ha-timeline .icon=${mdiCircleOutline}>
        ${entry.name} (${entry.entity_id}) turned ${entry.state}
      </ha-timeline>
    `;
  }

  private _renderActionTrace(path: string, _value: ActionTrace[]) {
    return html`
      <ha-timeline .icon=${mdiRecordCircleOutline}>
        ${getConfigFromPath(this.trace!.config, path).alias || pathToName(path)}
      </ha-timeline>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        ha-timeline[lastItem].condition {
          --timeline-ball-color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-trace": HaAutomationTracer;
  }
}

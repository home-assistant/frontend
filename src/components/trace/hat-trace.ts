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
  getDataFromPath,
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
import { Action, describeAction } from "../../data/script";
import relativeTime from "../../common/datetime/relative_time";

const LOGBOOK_ENTRIES_BEFORE_FOLD = 2;

const pathToName = (path: string) => path.split("/").join(" ");

// Report time entry when more than this time has passed
const SIGNIFICANT_TIME_CHANGE = 5000; // 5 seconds

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
            ${getDataFromPath(this.trace!.config, path).alias ||
            pathToName(path)}
            ${value[0].result.result ? "passed" : "failed"}
          </ha-timeline>
        `);
      }
    }

    if (this.trace.action_trace && this.logbookEntries) {
      const actionTraces = Object.values(this.trace.action_trace);

      let logbookIndex = 0;
      let actionTraceIndex = 0;
      let lastReportedTime = new Date(this.trace.timestamp.start);

      const maybeRenderTime = (nextItemTimestamp: Date) => {
        if (
          nextItemTimestamp.getTime() - lastReportedTime.getTime() <
          SIGNIFICANT_TIME_CHANGE
        ) {
          return;
        }

        entries.push(html`
          <ha-timeline label>
            ${relativeTime(lastReportedTime, this.hass.localize, {
              compareTime: nextItemTimestamp,
              includeTense: false,
            })}
            later
          </ha-timeline>
        `);
        lastReportedTime = nextItemTimestamp;
      };

      let groupedLogbookItems: LogbookEntry[] = [];

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
        const actionTimestamp = new Date(actionTrace[0].timestamp);

        if (new Date(logbookItem.when) > actionTimestamp) {
          actionTraceIndex++;
          if (groupedLogbookItems.length > 0) {
            maybeRenderTime(new Date(groupedLogbookItems[0].when));
            entries.push(this._renderLogbookEntries(groupedLogbookItems));
            groupedLogbookItems = [];
          }
          maybeRenderTime(actionTimestamp);
          entries.push(this._renderActionTrace(actionTrace));
        } else {
          logbookIndex++;
          groupedLogbookItems.push(logbookItem);
        }
      }

      while (logbookIndex < this.logbookEntries.length) {
        groupedLogbookItems.push(this.logbookEntries[logbookIndex]);
        logbookIndex++;
      }

      if (groupedLogbookItems.length > 0) {
        maybeRenderTime(new Date(groupedLogbookItems[0].when));
        entries.push(this._renderLogbookEntries(groupedLogbookItems));
      }

      while (actionTraceIndex < actionTraces.length) {
        const trace = actionTraces[actionTraceIndex];
        maybeRenderTime(new Date(trace[0].timestamp));
        entries.push(this._renderActionTrace(trace));
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
              ${(
                (new Date(this.trace.timestamp.finish!).getTime() -
                  new Date(this.trace.timestamp.start).getTime()) /
                1000
              ).toFixed(2)}
              seconds)`
            : "Still running"}
        </ha-timeline>
      `);
    }

    return html`${entries}`;
  }

  private _renderLogbookEntryHelper(entry: LogbookEntry) {
    return html`${entry.name} (${entry.entity_id}) turned ${entry.state}<br />`;
  }

  private _renderLogbookEntries(entries: LogbookEntry[]) {
    const parts: TemplateResult[] = [];

    let i;

    for (
      i = 0;
      i < Math.min(entries.length, LOGBOOK_ENTRIES_BEFORE_FOLD);
      i++
    ) {
      parts.push(this._renderLogbookEntryHelper(entries[i]));
    }

    let moreItems: TemplateResult[] | undefined;

    if (i < entries.length) {
      moreItems = [];
      for (i = 0; i < entries.length; i++) {
        moreItems.push(this._renderLogbookEntryHelper(entries[i]));
      }
    }

    return html`
      <ha-timeline .icon=${mdiCircleOutline} .moreItems=${moreItems}>
        ${parts}
      </ha-timeline>
    `;
  }

  private _renderActionTrace(value: ActionTrace[]) {
    const path = value[0].path;
    let data;
    try {
      data = getDataFromPath(this.trace!.config, path);
    } catch (err) {
      return html`Unable to extract path ${path}. Download trace and report as
      bug`;
    }

    const description =
      // Top-level we know it's an action
      path.split("/").length === 2
        ? data.alias || describeAction(data, this.hass.localize)
        : path.replace(/\//g, " ");

    return html`
      <ha-timeline .icon=${mdiRecordCircleOutline}>
        ${description}
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

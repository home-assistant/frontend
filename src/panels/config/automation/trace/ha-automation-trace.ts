import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { AutomationEntity } from "../../../../data/automation";
import {
  ActionTrace,
  AutomationTraceExtended,
  getConfigFromPath,
  loadAutomationTrace,
  loadAutomationTraces,
} from "../../../../data/automation_debug";
import "../../../../components/ha-card";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import { configSections } from "../../ha-panel-config";
import "./ha-timeline";
import {
  getLogbookDataForContext,
  LogbookEntry,
} from "../../../../data/logbook";
import {
  mdiCheckCircleOutline,
  mdiCircle,
  mdiCircleOutline,
  mdiPauseCircleOutline,
  mdiRecordCircleOutline,
  mdiStopCircleOutline,
} from "@mdi/js";

const pathToName = (path: string) => path.split("/").join(" ");

export class HaAutomationTracer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _trace?: AutomationTraceExtended;

  @internalProperty() private _logbookEntries?: LogbookEntry[];

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        <ha-card
          .header=${`Trace for ${
            stateObj?.attributes.friendly_name || this._entityId
          }`}
        >
          <button class="load-last" @click=${this._loadTrace}>
            Load last trace
          </button>
          ${this._trace
            ? html`
                <div class="card-content">
                  ${this._getTimelineEntries()}
                </div>
              `
            : ""}
        </ha-card>
      </hass-tabs-subpage>
    `;
  }

  private _getTimelineEntries() {
    if (!this._trace) {
      return [];
    }

    const entries = [
      html`
        <ha-timeline .icon=${mdiCircle}>
          Triggered by the ${this._trace.variables.trigger.description} at
          ${formatDateTimeWithSeconds(
            new Date(this._trace.timestamp.start),
            this.hass.language
          )}
        </ha-timeline>
      `,
    ];

    if (this._trace.condition_trace) {
      for (const [path, value] of Object.entries(this._trace.condition_trace)) {
        entries.push(html`
          <ha-timeline
            ?lastItem=${!value[0].result.result}
            class="condition"
            .icon=${value[0].result.result
              ? mdiCheckCircleOutline
              : mdiStopCircleOutline}
          >
            ${getConfigFromPath(this._trace!.config, path).alias ||
            pathToName(path)}
            ${value[0].result.result ? "passed" : "failed"}
          </ha-timeline>
        `);
      }
    }

    if (this._trace.action_trace && this._logbookEntries) {
      const actionTraces = Object.entries(this._trace.action_trace);

      let logbookIndex = 0;
      let actionTraceIndex = 0;

      while (
        logbookIndex < this._logbookEntries.length &&
        actionTraceIndex < actionTraces.length
      ) {
        // Find next item.

        // Skip the "automation got triggered item"
        if (
          logbookIndex === 0 &&
          this._logbookEntries[0].entity_id === this._entityId
        ) {
          logbookIndex++;
          continue;
        }

        // Find next item time-wise.
        const logbookItem = this._logbookEntries[logbookIndex];
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
      while (logbookIndex < this._logbookEntries.length) {
        entries.push(
          this._renderLogbookEntry(this._logbookEntries[logbookIndex])
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
    if (this._trace.last_action !== null) {
      entries.push(html`
        <ha-timeline
          lastItem
          .icon=${this._trace.timestamp.finish
            ? mdiCircle
            : mdiPauseCircleOutline}
        >
          ${this._trace.timestamp.finish
            ? html`Finished at
              ${formatDateTimeWithSeconds(
                new Date(this._trace.timestamp.finish),
                this.hass.language
              )}
              (runtime:
              ${Math.round(
                // @ts-expect-error
                (new Date(this._trace.timestamp.finish!) -
                  // @ts-expect-error
                  new Date(this._trace.timestamp.start)) /
                  1000,
                1
              )}
              seconds)`
            : "Still running"}
        </ha-timeline>
      `);
    }

    return entries;
  }

  private _renderLogbookEntry(entry: LogbookEntry) {
    return html`
      <ha-timeline .icon=${mdiCircleOutline}>
        ${entry.name} (${entry.entity_id}) turned ${entry.state}
      </ha-timeline>
    `;
  }

  private _renderActionTrace(path: string, value: ActionTrace[]) {
    return html`
      <ha-timeline .icon=${mdiRecordCircleOutline}>
        ${getConfigFromPath(this._trace!.config, path).alias ||
        pathToName(path)}
      </ha-timeline>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("automationId")) {
      this._entityId = undefined;
      this._trace = undefined;
      this._loadTrace();
    }

    if (
      changedProps.has("automations") &&
      this.automationId &&
      !this._entityId
    ) {
      this._setEntityId();
    }
  }

  private async _loadTrace() {
    const traces = await loadAutomationTraces(this.hass);
    const automationTraces = traces[this.automationId];

    if (!automationTraces || automationTraces.length === 0) {
      // TODO no trace found.
      alert("NO traces found");
      return;
    }

    const trace = await loadAutomationTrace(
      this.hass,
      this.automationId,
      automationTraces[automationTraces.length - 1].run_id
    );
    this._logbookEntries = await getLogbookDataForContext(
      this.hass,
      trace.timestamp.start,
      trace.context.id
    );

    this._trace = trace;
  }

  private _setEntityId() {
    const automation = this.automations.find(
      (entity: AutomationEntity) => entity.attributes.id === this.automationId
    );
    this._entityId = automation?.entity_id;
  }

  private _backTapped(): void {
    history.back();
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          max-width: 800px;
          margin: 24px auto;
        }

        .load-last {
          position: absolute;
          top: 8px;
          right: 8px;
        }

        ha-timeline[lastItem].condition {
          --timeline-ball-color: var(--error-color);
        }
      `,
    ];
  }
}

customElements.define("ha-automation-trace", HaAutomationTracer);

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace": HaAutomationTracer;
  }
}

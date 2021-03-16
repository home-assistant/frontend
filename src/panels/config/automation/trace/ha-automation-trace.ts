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
import { AutomationEntity } from "../../../../data/automation";
import {
  AutomationTrace,
  AutomationTraceExtended,
  loadAutomationTrace,
  loadAutomationTraces,
} from "../../../../data/automation_debug";
import "../../../../components/ha-card";
import "../../../../components/trace/hat-trace";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import { configSections } from "../../ha-panel-config";
import {
  getLogbookDataForContext,
  LogbookEntry,
} from "../../../../data/logbook";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { repeat } from "lit-html/directives/repeat";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";

@customElement("ha-automation-trace")
export class HaAutomationTrace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _traces?: AutomationTrace[];

  @internalProperty() private _runId?: string;

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
          <div class="actions">
            ${this._traces && this._traces.length > 0
              ? html`
                  <select .value=${this._runId} @change=${this._pickTrace}>
                    ${repeat(
                      this._traces,
                      (trace) => trace.run_id,
                      (trace) =>
                        html`<option value=${trace.run_id}
                          >${formatDateTimeWithSeconds(
                            new Date(trace.timestamp.start),
                            this.hass.language
                          )}</option
                        >`
                    )}
                  </select>
                `
              : ""}
            <button @click=${this._loadTraces}>
              Refresh
            </button>
            <button @click=${this._downloadTrace}>
              Download
            </button>
          </div>
          <div class="card-content">
            ${this._traces === undefined
              ? "Loading…"
              : this._traces.length === 0
              ? "No traces found"
              : this._trace === undefined
              ? "Loading…"
              : html`
                  <hat-trace
                    .hass=${this.hass}
                    .trace=${this._trace}
                    .logbookEntries=${this._logbookEntries}
                  ></hat-trace>
                `}
          </div>
        </ha-card>
      </hass-tabs-subpage>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("automationId")) {
      this._traces = undefined;
      this._entityId = undefined;
      this._runId = undefined;
      this._trace = undefined;
      this._logbookEntries = undefined;
      if (this.automationId) {
        this._loadTraces();
      }
    }

    if (changedProps.has("_runId") && this._runId) {
      this._trace = undefined;
      this._logbookEntries = undefined;
      if (this._runId) {
        this._loadTrace();
      }
    }

    if (
      changedProps.has("automations") &&
      this.automationId &&
      !this._entityId
    ) {
      const automation = this.automations.find(
        (entity: AutomationEntity) => entity.attributes.id === this.automationId
      );
      this._entityId = automation?.entity_id;
    }
  }

  private _pickTrace(ev) {
    this._runId = ev.target.value;
  }

  private async _loadTraces() {
    this._traces = await loadAutomationTraces(this.hass, this.automationId);
    // Newest will be on top.
    this._traces.reverse();

    // Check if current run ID still exists
    if (
      this._runId &&
      !this._traces.every((trace) => trace.run_id === this._runId)
    ) {
      await showAlertDialog(this, {
        text: "Chosen trace is no longer available",
        confirm: () => {
          this._runId = this._traces![0].run_id;
        },
      });
      this._runId = undefined;
    }

    // See if we can set a default runID
    if (!this._runId && this._traces.length > 0) {
      this._runId = this._traces[0].run_id;
    }
  }

  private async _loadTrace() {
    const trace = await loadAutomationTrace(
      this.hass,
      this.automationId,
      this._runId!
    );
    this._logbookEntries = await getLogbookDataForContext(
      this.hass,
      trace.timestamp.start,
      trace.context.id
    );

    this._trace = trace;
  }

  private _backTapped(): void {
    history.back();
  }

  private _downloadTrace() {
    const aEl = document.createElement("a");
    aEl.download = `trace-${this._entityId}.json`;
    aEl.href = `data:application/json;charset=utf-8,${encodeURI(
      JSON.stringify(
        {
          trace: this._trace,
          logbookEntries: this._logbookEntries,
        },
        undefined,
        2
      )
    )}`;
    aEl.click();
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          max-width: 800px;
          margin: 24px auto;
        }

        .actions {
          position: absolute;
          top: 8px;
          right: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace": HaAutomationTrace;
  }
}

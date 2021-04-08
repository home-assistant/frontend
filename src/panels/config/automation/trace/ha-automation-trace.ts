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
  loadTrace,
  loadTraces,
} from "../../../../data/trace";
import "../../../../components/trace/hat-script-graph";
import type { NodeInfo } from "../../../../components/trace/hat-graph";
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
import "./ha-automation-trace-path-details";
import "./ha-automation-trace-timeline";
import "./ha-automation-trace-config";
import "./ha-automation-trace-logbook";
import { classMap } from "lit-html/directives/class-map";
import { traceTabStyles } from "./styles";
import {
  mdiRayEndArrow,
  mdiRayStartArrow,
  mdiPencil,
  mdiRefresh,
  mdiDownload,
} from "@mdi/js";
import "./ha-automation-trace-blueprint-config";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";

@customElement("ha-automation-trace")
export class HaAutomationTrace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property({ attribute: false }) public automations!: AutomationEntity[];

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _traces?: AutomationTrace[];

  @internalProperty() private _runId?: string;

  @internalProperty() private _selected?: NodeInfo;

  @internalProperty() private _trace?: AutomationTraceExtended;

  @internalProperty() private _logbookEntries?: LogbookEntry[];

  @internalProperty() private _view:
    | "details"
    | "config"
    | "timeline"
    | "logbook"
    | "blueprint" = "details";

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    const trackedNodes = this.shadowRoot!.querySelector(
      "hat-script-graph"
    )?.getTrackedNodes();

    const title = stateObj?.attributes.friendly_name || this._entityId;

    const actionButtons = html`
      <mwc-icon-button label="Refresh" @click=${() => this._loadTraces()}>
        <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
      </mwc-icon-button>
      <mwc-icon-button
        .disabled=${!this._runId}
        label="Download Trace"
        @click=${this._downloadTrace}
      >
        <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
      </mwc-icon-button>
    `;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configSections.automation}
      >
        ${this.narrow
          ? html`<span slot="header">
                ${title}
              </span>
              <div slot="toolbar-icon">
                ${actionButtons}
              </div>`
          : ""}
        <div class="toolbar">
          ${!this.narrow
            ? html`<div>
                ${title}
                <a
                  class="linkButton"
                  href="/config/automation/edit/${this.automationId}"
                >
                  <mwc-icon-button label="Edit Automation" tabindex="-1">
                    <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                  </mwc-icon-button>
                </a>
              </div>`
            : ""}
          ${this._traces && this._traces.length > 0
            ? html`
                <div>
                  <mwc-icon-button
                    .disabled=${this._traces[this._traces.length - 1].run_id ===
                    this._runId}
                    label="Older trace"
                    @click=${this._pickOlderTrace}
                  >
                    <ha-svg-icon .path=${mdiRayEndArrow}></ha-svg-icon>
                  </mwc-icon-button>
                  <select .value=${this._runId} @change=${this._pickTrace}>
                    ${repeat(
                      this._traces,
                      (trace) => trace.run_id,
                      (trace) =>
                        html`<option value=${trace.run_id}
                          >${formatDateTimeWithSeconds(
                            new Date(trace.timestamp.start),
                            this.hass.locale
                          )}</option
                        >`
                    )}
                  </select>
                  <mwc-icon-button
                    .disabled=${this._traces[0].run_id === this._runId}
                    label="Newer trace"
                    @click=${this._pickNewerTrace}
                  >
                    <ha-svg-icon .path=${mdiRayStartArrow}></ha-svg-icon>
                  </mwc-icon-button>
                </div>
              `
            : ""}
          ${!this.narrow ? html`<div>${actionButtons}</div>` : ""}
        </div>

        ${this._traces === undefined
          ? html`<div class="container">Loading…</div>`
          : this._traces.length === 0
          ? html`<div class="container">No traces found</div>`
          : this._trace === undefined
          ? ""
          : html`
              <div class="main">
                <div class="graph">
                  <hat-script-graph
                    .trace=${this._trace}
                    .selected=${this._selected?.path}
                    @graph-node-selected=${this._pickNode}
                  ></hat-script-graph>
                </div>

                <div class="info">
                  <div class="tabs top">
                    ${[
                      ["details", "Step Details"],
                      ["timeline", "Trace Timeline"],
                      ["logbook", "Related logbook entries"],
                      ["config", "Automation Config"],
                    ].map(
                      ([view, label]) => html`
                        <button
                          tabindex="0"
                          .view=${view}
                          class=${classMap({ active: this._view === view })}
                          @click=${this._showTab}
                        >
                          ${label}
                        </button>
                      `
                    )}
                    ${this._trace.blueprint_inputs
                      ? html`
                          <button
                            tabindex="0"
                            .view=${"blueprint"}
                            class=${classMap({
                              active: this._view === "blueprint",
                            })}
                            @click=${this._showTab}
                          >
                            Blueprint Config
                          </div>
                        `
                      : ""}
                  </div>
                  ${this._selected === undefined ||
                  this._logbookEntries === undefined ||
                  trackedNodes === undefined
                    ? ""
                    : this._view === "details"
                    ? html`
                        <ha-automation-trace-path-details
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .trace=${this._trace}
                          .selected=${this._selected}
                          .logbookEntries=${this._logbookEntries}
                          .trackedNodes=${trackedNodes}
                        ></ha-automation-trace-path-details>
                      `
                    : this._view === "config"
                    ? html`
                        <ha-automation-trace-config
                          .hass=${this.hass}
                          .trace=${this._trace}
                        ></ha-automation-trace-config>
                      `
                    : this._view === "logbook"
                    ? html`
                        <ha-automation-trace-logbook
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .logbookEntries=${this._logbookEntries}
                        ></ha-automation-trace-logbook>
                      `
                    : this._view === "blueprint"
                    ? html`
                        <ha-automation-trace-blueprint-config
                          .hass=${this.hass}
                          .trace=${this._trace}
                        ></ha-automation-trace-blueprint-config>
                      `
                    : html`
                        <ha-automation-trace-timeline
                          .hass=${this.hass}
                          .trace=${this._trace}
                          .logbookEntries=${this._logbookEntries}
                          .selected=${this._selected}
                          @value-changed=${this._timelinePathPicked}
                        ></ha-automation-trace-timeline>
                      `}
                </div>
              </div>
            `}
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (!this.automationId) {
      return;
    }

    const params = new URLSearchParams(location.search);
    this._loadTraces(params.get("run_id") || undefined);
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    // Only reset if automationId has changed and we had one before.
    if (changedProps.get("automationId")) {
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
      this.shadowRoot!.querySelector("select")!.value = this._runId;
      this._loadTrace();
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

  private _pickOlderTrace() {
    const curIndex = this._traces!.findIndex((tr) => tr.run_id === this._runId);
    this._runId = this._traces![curIndex + 1].run_id;
    this._selected = undefined;
  }

  private _pickNewerTrace() {
    const curIndex = this._traces!.findIndex((tr) => tr.run_id === this._runId);
    this._runId = this._traces![curIndex - 1].run_id;
    this._selected = undefined;
  }

  private _pickTrace(ev) {
    this._runId = ev.target.value;
    this._selected = undefined;
  }

  private _pickNode(ev) {
    this._selected = ev.detail;
  }

  private async _loadTraces(runId?: string) {
    this._traces = await loadTraces(this.hass, "automation", this.automationId);
    // Newest will be on top.
    this._traces.reverse();

    if (runId) {
      this._runId = runId;
    }

    // Check if current run ID still exists
    if (
      this._runId &&
      !this._traces.some((trace) => trace.run_id === this._runId)
    ) {
      this._runId = undefined;
      this._selected = undefined;

      // If we came here from a trace passed into the url, clear it.
      if (runId) {
        const params = new URLSearchParams(location.search);
        params.delete("run_id");
        history.replaceState(
          null,
          "",
          `${location.pathname}?${params.toString()}`
        );
      }

      await showAlertDialog(this, {
        text: "Chosen trace is no longer available",
      });
    }

    // See if we can set a default runID
    if (!this._runId && this._traces.length > 0) {
      this._runId = this._traces[0].run_id;
    }
  }

  private async _loadTrace() {
    const trace = await loadTrace(
      this.hass,
      "automation",
      this.automationId,
      this._runId!
    );
    this._logbookEntries = isComponentLoaded(this.hass, "logbook")
      ? await getLogbookDataForContext(
          this.hass,
          trace.timestamp.start,
          trace.context.id
        )
      : [];

    this._trace = trace;
  }

  private _downloadTrace() {
    const aEl = document.createElement("a");
    aEl.download = `trace ${this._entityId} ${
      this._trace!.timestamp.start
    }.json`;
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

  private _showTab(ev) {
    this._view = (ev.target as any).view;
  }

  private _timelinePathPicked(ev) {
    const path = ev.detail.value;
    const nodes = this.shadowRoot!.querySelector(
      "hat-script-graph"
    )!.getTrackedNodes();
    if (nodes[path]) {
      this._selected = nodes[path];
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      traceTabStyles,
      css`
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 20px;
          height: var(--header-height);
          padding: 0 16px;
          background-color: var(--primary-background-color);
          font-weight: 400;
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
        }

        .toolbar > * {
          display: flex;
          align-items: center;
        }

        :host([narrow]) .toolbar > * {
          display: contents;
        }

        .main {
          height: calc(100% - 56px);
          display: flex;
          background-color: var(--card-background-color);
        }

        :host([narrow]) .main {
          height: auto;
          flex-direction: column;
        }

        .container {
          padding: 16px;
        }

        .graph {
          border-right: 1px solid var(--divider-color);
          overflow-x: auto;
          max-width: 50%;
        }
        :host([narrow]) .graph {
          max-width: 100%;
        }

        .info {
          flex: 1;
          background-color: var(--card-background-color);
        }

        .linkButton {
          color: var(--primary-text-color);
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

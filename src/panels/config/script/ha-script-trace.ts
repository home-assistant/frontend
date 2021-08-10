import {
  mdiDownload,
  mdiPencil,
  mdiRayEndArrow,
  mdiRayStartArrow,
  mdiRefresh,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";
import "../../../components/trace/hat-script-graph";
import { getLogbookDataForContext, LogbookEntry } from "../../../data/logbook";
import { ScriptEntity } from "../../../data/script";
import {
  loadTrace,
  loadTraces,
  ScriptTrace,
  ScriptTraceExtended,
} from "../../../data/trace";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { traceTabStyles } from "../../../components/trace/trace-tab-styles";
import { configSections } from "../ha-panel-config";
import "../../../components/trace/ha-trace-blueprint-config";
import "../../../components/trace/ha-trace-config";
import "../../../components/trace/ha-trace-logbook";
import "../../../components/trace/ha-trace-path-details";
import "../../../components/trace/ha-trace-timeline";
import type {
  HatScriptGraph,
  NodeInfo,
} from "../../../components/trace/hat-script-graph";

@customElement("ha-script-trace")
export class HaScriptTrace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scriptEntityId!: string;

  @property({ attribute: false }) public scripts!: ScriptEntity[];

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _traces?: ScriptTrace[];

  @state() private _runId?: string;

  @state() private _selected?: NodeInfo;

  @state() private _trace?: ScriptTraceExtended;

  @state() private _logbookEntries?: LogbookEntry[];

  @state() private _view:
    | "details"
    | "config"
    | "timeline"
    | "logbook"
    | "blueprint" = "details";

  @query("hat-script-graph") private _graph?: HatScriptGraph;

  protected render(): TemplateResult {
    const stateObj = this.scriptEntityId
      ? this.hass.states[this.scriptEntityId]
      : undefined;

    const graph = this._graph;
    const trackedNodes = graph?.trackedNodes;
    const renderedNodes = graph?.renderedNodes;

    const title = stateObj?.attributes.friendly_name || this.scriptEntityId;

    let devButtons: TemplateResult | string = "";
    if (__DEV__) {
      devButtons = html`<div style="position: absolute; right: 0;">
        <button @click=${this._importTrace}>Import trace</button>
        <button @click=${this._loadLocalStorageTrace}>Load stored trace</button>
      </div>`;
    }

    const actionButtons = html`
      <mwc-icon-button label="Refresh" @click=${() => this._loadTraces()}>
        <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
      </mwc-icon-button>
      <mwc-icon-button
        .disabled=${!this._trace}
        label="Download Trace"
        @click=${this._downloadTrace}
      >
        <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
      </mwc-icon-button>
    `;

    return html`
      ${devButtons}
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configSections.automation}
      >
        ${this.narrow
          ? html`<span slot="header"> ${title} </span>
              <div slot="toolbar-icon">${actionButtons}</div>`
          : ""}
        <div class="toolbar">
          ${!this.narrow
            ? html`<div>
                ${title}
                <a
                  class="linkButton"
                  href="/config/script/edit/${this.scriptEntityId}"
                >
                  <mwc-icon-button label="Edit Script" tabindex="-1">
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
                        html`<option value=${trace.run_id}>
                          ${formatDateTimeWithSeconds(
                            new Date(trace.timestamp.start),
                            this.hass.locale
                          )}
                        </option>`
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
                      ["config", "Script Config"],
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
                          </button>
                        `
                      : ""}
                  </div>
                  ${this._selected === undefined ||
                  this._logbookEntries === undefined ||
                  trackedNodes === undefined
                    ? ""
                    : this._view === "details"
                    ? html`
                        <ha-trace-path-details
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .trace=${this._trace}
                          .selected=${this._selected}
                          .logbookEntries=${this._logbookEntries}
                          .trackedNodes=${trackedNodes}
                          .renderedNodes=${renderedNodes!}
                        ></ha-trace-path-details>
                      `
                    : this._view === "config"
                    ? html`
                        <ha-trace-config
                          .hass=${this.hass}
                          .trace=${this._trace}
                        ></ha-trace-config>
                      `
                    : this._view === "logbook"
                    ? html`
                        <ha-trace-logbook
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .trace=${this._trace}
                          .logbookEntries=${this._logbookEntries}
                        ></ha-trace-logbook>
                      `
                    : this._view === "blueprint"
                    ? html`
                        <ha-trace-blueprint-config
                          .hass=${this.hass}
                          .trace=${this._trace}
                        ></ha-trace-blueprint-config>
                      `
                    : html`
                        <ha-trace-timeline
                          .hass=${this.hass}
                          .trace=${this._trace}
                          .logbookEntries=${this._logbookEntries}
                          .selected=${this._selected}
                          @value-changed=${this._timelinePathPicked}
                        ></ha-trace-timeline>
                      `}
                </div>
              </div>
            `}
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (!this.scriptEntityId) {
      return;
    }

    const params = new URLSearchParams(location.search);
    this._loadTraces(params.get("run_id") || undefined);
  }

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    // Only reset if scriptEntityId has changed and we had one before.
    if (changedProps.get("scriptEntityId")) {
      this._traces = undefined;
      this._runId = undefined;
      this._trace = undefined;
      this._logbookEntries = undefined;
      if (this.scriptEntityId) {
        this._loadTraces();
      }
    }

    if (changedProps.has("_runId") && this._runId) {
      this._trace = undefined;
      this._logbookEntries = undefined;
      this._loadTrace();
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
    this._traces = await loadTraces(
      this.hass,
      "script",
      this.scriptEntityId.split(".")[1]
    );
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
      "script",
      this.scriptEntityId.split(".")[1],
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
    aEl.download = `trace ${this.scriptEntityId} ${
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

  private _importTrace() {
    const traceText = prompt("Enter downloaded trace");
    if (!traceText) {
      return;
    }
    localStorage.devTrace = traceText;
    this._loadLocalTrace(traceText);
  }

  private _loadLocalStorageTrace() {
    if (localStorage.devTrace) {
      this._loadLocalTrace(localStorage.devTrace);
    }
  }

  private _loadLocalTrace(traceText: string) {
    const traceInfo = JSON.parse(traceText);
    this._trace = traceInfo.trace;
    this._logbookEntries = traceInfo.logbookEntries;
  }

  private _showTab(ev: Event) {
    this._view = (ev.target as any).view;
  }

  private _timelinePathPicked(ev: CustomEvent) {
    const path = ev.detail.value;
    const nodes = this._graph!.trackedNodes;
    if (nodes[path]) {
      this._selected = nodes[path];
    }
  }

  static get styles(): CSSResultGroup {
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
    "ha-script-trace": HaScriptTrace;
  }
}

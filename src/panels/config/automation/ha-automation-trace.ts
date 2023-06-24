import {
  mdiDotsVertical,
  mdiDownload,
  mdiInformationOutline,
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
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/trace/ha-trace-blueprint-config";
import "../../../components/trace/ha-trace-config";
import "../../../components/trace/ha-trace-logbook";
import "../../../components/trace/ha-trace-path-details";
import "../../../components/trace/ha-trace-timeline";
import "../../../components/trace/hat-script-graph";
import type {
  HatScriptGraph,
  NodeInfo,
} from "../../../components/trace/hat-script-graph";
import { traceTabStyles } from "../../../components/trace/trace-tab-styles";
import { AutomationEntity } from "../../../data/automation";
import { getLogbookDataForContext, LogbookEntry } from "../../../data/logbook";
import {
  AutomationTrace,
  AutomationTraceExtended,
  loadTrace,
  loadTraces,
} from "../../../data/trace";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { computeRTL } from "../../../common/util/compute_rtl";

@customElement("ha-automation-trace")
export class HaAutomationTrace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property({ attribute: false }) public automations!: AutomationEntity[];

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _entityId?: string;

  @state() private _traces?: AutomationTrace[];

  @state() private _runId?: string;

  @state() private _selected?: NodeInfo;

  @state() private _trace?: AutomationTraceExtended;

  @state() private _logbookEntries?: LogbookEntry[];

  @state() private _view:
    | "details"
    | "config"
    | "timeline"
    | "logbook"
    | "blueprint" = "details";

  @query("hat-script-graph") private _graph?: HatScriptGraph;

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    const graph = this._graph;
    const trackedNodes = graph?.trackedNodes;
    const renderedNodes = graph?.renderedNodes;

    const title = stateObj?.attributes.friendly_name || this._entityId;

    let devButtons: TemplateResult | string = "";
    if (__DEV__) {
      devButtons = html`<div style="position: absolute; right: 0;">
        <button @click=${this._importTrace}>Import trace</button>
        <button @click=${this._loadLocalStorageTrace}>Load stored trace</button>
      </div>`;
    }

    return html`
      ${devButtons}
      <hass-subpage .hass=${this.hass} .narrow=${this.narrow} .header=${title}>
        ${!this.narrow && stateObj?.attributes.id
          ? html`
              <a
                class="trace-link"
                href="/config/automation/edit/${stateObj.attributes.id}"
                slot="toolbar-icon"
              >
                <mwc-button>
                  ${this.hass.localize(
                    "ui.panel.config.automation.trace.edit_automation"
                  )}
                </mwc-button>
              </a>
            `
          : ""}
        <ha-button-menu slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <mwc-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._showInfo}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.show_info")}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </mwc-list-item>

          ${stateObj?.attributes.id && this.narrow
            ? html`
                <a
                  class="trace-link"
                  href="/config/automation/edit/${stateObj.attributes.id}"
                >
                  <mwc-list-item graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.automation.trace.edit_automation"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiPencil}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>
              `
            : ""}

          <li divider role="separator"></li>

          <mwc-list-item graphic="icon" @click=${this._refreshTraces}>
            ${this.hass.localize("ui.panel.config.automation.trace.refresh")}
            <ha-svg-icon slot="graphic" .path=${mdiRefresh}></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            graphic="icon"
            .disabled=${!this._trace}
            @click=${this._downloadTrace}
          >
            ${this.hass.localize(
              "ui.panel.config.automation.trace.download_trace"
            )}
            <ha-svg-icon slot="graphic" .path=${mdiDownload}></ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>

        <div class="toolbar">
          ${this._traces && this._traces.length > 0
            ? html`
                <ha-icon-button
                  .label=${this.hass!.localize(
                    "ui.panel.config.automation.trace.older_trace"
                  )}
                  .path=${computeRTL(this.hass!)
                    ? mdiRayStartArrow
                    : mdiRayEndArrow}
                  .disabled=${this._traces[this._traces.length - 1].run_id ===
                  this._runId}
                  @click=${this._pickOlderTrace}
                ></ha-icon-button>
                <select .value=${this._runId} @change=${this._pickTrace}>
                  ${repeat(
                    this._traces,
                    (trace) => trace.run_id,
                    (trace) =>
                      html`<option value=${trace.run_id}>
                        ${formatDateTimeWithSeconds(
                          new Date(trace.timestamp.start),
                          this.hass.locale,
                          this.hass.config
                        )}
                      </option>`
                  )}
                </select>
                <ha-icon-button
                  .label=${this.hass!.localize(
                    "ui.panel.config.automation.trace.newer_trace"
                  )}
                  .path=${computeRTL(this.hass!)
                    ? mdiRayEndArrow
                    : mdiRayStartArrow}
                  .disabled=${this._traces[0].run_id === this._runId}
                  @click=${this._pickNewerTrace}
                ></ha-icon-button>
              `
            : ""}
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
      </hass-subpage>
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

  private _refreshTraces() {
    this._loadTraces();
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

  private _showInfo() {
    if (!this.hass || !this._entityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this._entityId });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      traceTabStyles,
      css`
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          height: var(--header-height);
          padding: 4px;
          background-color: var(--primary-background-color);
          font-weight: 400;
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
        }

        .main {
          min-height: calc(100% - var(--header-height));
          display: flex;
          background-color: var(--card-background-color);
          direction: ltr;
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
          padding-bottom: 16px;
        }
        :host([narrow]) .graph {
          max-width: 100%;
          justify-content: center;
          display: flex;
        }
        .info {
          flex: 1;
          background-color: var(--card-background-color);
        }
        .trace-link {
          text-decoration: none;
        }

        ha-trace-logbook {
          direction: var(--direction);
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

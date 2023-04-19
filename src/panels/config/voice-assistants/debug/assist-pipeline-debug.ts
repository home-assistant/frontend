import {
  mdiMicrophoneMessage,
  mdiRayEndArrow,
  mdiRayStartArrow,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import {
  listAssistPipelineRuns,
  getAssistPipelineRun,
  PipelineRunEvent,
  assistSessionListing,
} from "../../../../data/assist_pipeline";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import "./assist-render-pipeline-events";

@customElement("assist-pipeline-debug")
export class AssistPipelineDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property() public pipelineId!: string;

  @state() private _sessionId?: string;

  @state() private _sessions?: assistSessionListing[];

  @state() private _runs?: { events: PipelineRunEvent[] }[];

  protected render() {
    return html`<hass-subpage
      .narrow=${this.narrow}
      .hass=${this.hass}
      header="Debug Assistant"
    >
      <a
        href="/config/voice-assistants/debug?pipeline=${this.pipelineId}"
        slot="toolbar-icon"
        ><ha-icon-button .path=${mdiMicrophoneMessage}></ha-icon-button
      ></a>
      <div class="toolbar">
        ${this._sessions?.length
          ? html`
              <ha-icon-button
                .disabled=${this._sessions[this._sessions.length - 1]
                  .pipeline_session_id === this._sessionId}
                label="Older run"
                @click=${this._pickOlderRun}
                .path=${mdiRayEndArrow}
              ></ha-icon-button>
              <select .value=${this._sessionId} @change=${this._pickRun}>
                ${repeat(
                  this._sessions,
                  (run) => run.pipeline_session_id,
                  (run) =>
                    html`<option value=${run.pipeline_session_id}>
                      ${formatDateTimeWithSeconds(
                        new Date(run.timestamp),
                        this.hass.locale
                      )}
                    </option>`
                )}
              </select>
              <ha-icon-button
                .disabled=${this._sessions[0].pipeline_session_id ===
                this._sessionId}
                label="Newer run"
                @click=${this._pickNewerRun}
                .path=${mdiRayStartArrow}
              ></ha-icon-button>
            `
          : ""}
      </div>
      ${!this._sessions?.length
        ? html`<div class="container">No sessions found</div>`
        : ""}
      <div class="content">
        ${this._runs
          ? this._runs.map(
              (run) => html`<assist-render-pipeline-events
                .hass=${this.hass}
                .events=${run.events}
              ></assist-render-pipeline-events>`
            )
          : ""}
      </div>
    </hass-subpage>`;
  }

  protected willUpdate(changedProperties) {
    if (changedProperties.has("pipelineId")) {
      this._fetchSessions();
    }
    if (changedProperties.has("_sessionId")) {
      this._fetchRuns();
    }
  }

  private async _fetchSessions() {
    if (!this.pipelineId) {
      this._sessions = undefined;
      return;
    }
    try {
      this._sessions = (
        await listAssistPipelineRuns(this.hass, this.pipelineId)
      ).pipeline_sessions?.reverse();
    } catch (e: any) {
      showAlertDialog(this, {
        title: "Failed to fetch pipeline runs",
        text: e.message,
      });
      return;
    }
    if (!this._sessions?.length) {
      return;
    }
    if (
      !this._sessionId ||
      !this._sessions.find((run) => run.pipeline_session_id === this._sessionId)
    ) {
      this._sessionId = this._sessions[0].pipeline_session_id;
      this._fetchRuns();
    }
  }

  private async _fetchRuns() {
    if (!this._sessionId) {
      this._runs = undefined;
      return;
    }
    try {
      this._runs = (
        await getAssistPipelineRun(this.hass, this.pipelineId, this._sessionId)
      ).runs;
    } catch (e: any) {
      showAlertDialog(this, {
        title: "Failed to fetch events",
        text: e.message,
      });
    }
  }

  private _pickOlderRun() {
    const curIndex = this._sessions!.findIndex(
      (run) => run.pipeline_session_id === this._sessionId
    );
    this._sessionId = this._sessions![curIndex + 1].pipeline_session_id;
  }

  private _pickNewerRun() {
    const curIndex = this._sessions!.findIndex(
      (run) => run.pipeline_session_id === this._sessionId
    );
    this._sessionId = this._sessions![curIndex - 1].pipeline_session_id;
  }

  private _pickRun(ev) {
    this._sessionId = ev.target.value;
  }

  static styles = [
    haStyle,
    css`
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: center;
        height: var(--header-height);
        background-color: var(--primary-background-color);
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
        box-sizing: border-box;
      }
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      .container {
        padding: 16px;
      }
      assist-render-pipeline-events {
        display: block;
      }
      assist-render-pipeline-events + assist-render-pipeline-events {
        padding-top: 16px;
        border-top: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-debug": AssistPipelineDebug;
  }
}

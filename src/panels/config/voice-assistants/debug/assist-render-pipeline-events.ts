import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  PipelineRun,
  PipelineRunEvent,
} from "../../../../data/assist_pipeline";
import { processEvent } from "../../../../data/assist_pipeline";
import type { HomeAssistant } from "../../../../types";
import "./assist-render-pipeline-run";
import type { ChatLog } from "../../../../data/chat_log";

@customElement("assist-render-pipeline-events")
export class AssistPipelineEvents extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public events!: PipelineRunEvent[];

  @property({ attribute: false }) public chatLog?: ChatLog;

  private _processEvents = memoizeOne(
    (events: PipelineRunEvent[]): PipelineRun | undefined => {
      let run: PipelineRun | undefined;
      events.forEach((event) => {
        run = processEvent(run, event);
      });
      return run;
    }
  );

  protected render(): TemplateResult {
    const run = this._processEvents(this.events);
    if (!run) {
      if (this.events.length) {
        return html`<ha-alert alert-type="error"
            >${this.hass.localize(
              "ui.panel.config.voice_assistants.debug.error.showing_run"
            )}</ha-alert
          >
          <ha-card>
            <ha-expansion-panel>
              <span slot="header"
                >${this.hass.localize(
                  "ui.panel.config.voice_assistants.debug.raw"
                )}</span
              >
              <pre>${JSON.stringify(this.events, null, 2)}</pre>
            </ha-expansion-panel>
          </ha-card>`;
      }
      return html`<ha-alert alert-type="warning"
        >${this.hass.localize(
          "ui.panel.config.voice_assistants.debug.no_events"
        )}</ha-alert
      >`;
    }
    return html`
      <assist-render-pipeline-run
        .hass=${this.hass}
        .pipelineRun=${run}
        .chatLog=${this.chatLog}
      ></assist-render-pipeline-run>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-render-pipeline-events": AssistPipelineEvents;
  }
}

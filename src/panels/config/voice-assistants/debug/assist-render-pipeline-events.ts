import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  PipelineRun,
  PipelineRunEvent,
  processEvent,
} from "../../../../data/assist_pipeline";
import type { HomeAssistant } from "../../../../types";
import "./assist-render-pipeline-run";

@customElement("assist-render-pipeline-events")
export class AssistPipelineEvents extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public events!: PipelineRunEvent[];

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
        return html`<ha-alert alert-type="error">Error showing run</ha-alert>
          <ha-card>
            <ha-expansion-panel>
              <span slot="header">Raw</span>
              <pre>${JSON.stringify(this.events, null, 2)}</pre>
            </ha-expansion-panel>
          </ha-card>`;
      }
      return html`<ha-alert alert-type="warning"
        >There where no events in this run.</ha-alert
      >`;
    }
    return html`
      <assist-render-pipeline-run
        .hass=${this.hass}
        .pipelineRun=${run}
      ></assist-render-pipeline-run>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-render-pipeline-events": AssistPipelineEvents;
  }
}

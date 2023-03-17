import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../../../../components/ha-card";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-textfield";
import {
  PipelineRun,
  runPipelineFromText,
} from "../../../../../../data/voice_assistant";
import "../../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("assist-pipeline-debug")
export class AssistPipelineDebug extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @query("#run-input", true)
  private _newRunInput!: HTMLInputElement;

  @state()
  private _pipelineRun?: PipelineRun;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="Assist Pipeline"
      >
        <div class="content">
          <ha-card header="Run pipeline" class="run-pipeline-card">
            <div class="card-content">
              <ha-textfield
                id="run-input"
                label="Input"
                value="Are the lights on?"
              ></ha-textfield>
            </div>
            <div class="card-actions">
              <ha-button
                @click=${this._runPipeline}
                .disabled=${this._pipelineRun &&
                !["error", "done"].includes(this._pipelineRun.stage)}
              >
                Run
              </ha-button>
            </div>
          </ha-card>
          ${this._pipelineRun
            ? html`
                <ha-card heading="Pipeline Run">
                  <div class="card-content">
                    <pre>${JSON.stringify(this._pipelineRun, null, 2)}</pre>
                  </div>
                </ha-card>
              `
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private _runPipeline(): void {
    this._pipelineRun = undefined;
    runPipelineFromText(
      this.hass,
      (run) => {
        this._pipelineRun = run;
      },
      {
        intent_input: this._newRunInput.value,
      }
    );
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      ha-card {
        margin-bottom: 16px;
      }
      .run-pipeline-card ha-textfield {
        display: block;
      }
      pre {
        margin: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-debug": AssistPipelineDebug;
  }
}

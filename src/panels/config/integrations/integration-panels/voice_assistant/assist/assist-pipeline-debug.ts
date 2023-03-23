import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../../../../components/ha-card";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-circular-progress";
import "../../../../../../components/ha-expansion-panel";
import "../../../../../../components/ha-textfield";
import {
  PipelineRun,
  runPipelineFromText,
} from "../../../../../../data/voice_assistant";
import "../../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";
import { formatNumber } from "../../../../../../common/number/format_number";

const RUN_DATA = {
  pipeline: "Pipeline",
  language: "Language",
};

const ERROR_DATA = {
  code: "Code",
  message: "Message",
};

const STT_DATA = {
  engine: "Engine",
};

const INTENT_DATA = {
  engine: "Engine",
  intent_input: "Input",
};

const TTS_DATA = {
  engine: "Engine",
  tts_input: "Input",
};

const STAGES: Record<PipelineRun["stage"], number> = {
  ready: 0,
  stt: 1,
  intent: 2,
  tts: 3,
  done: 4,
  error: 5,
};

const hasStage = (run: PipelineRun, stage: PipelineRun["stage"]) =>
  STAGES[run.init_options.start_stage] <= STAGES[stage] &&
  STAGES[stage] <= STAGES[run.init_options.end_stage];

const renderProgress = (
  hass: HomeAssistant,
  pipelineRun: PipelineRun,
  stage: PipelineRun["stage"]
) => {
  const startEvent = pipelineRun.events.find(
    (ev) => ev.type === `${stage}-start`
  );
  const finishEvent = pipelineRun.events.find(
    (ev) => ev.type === `${stage}-end`
  );

  if (!startEvent) {
    return "";
  }

  if (!finishEvent) {
    return html`<ha-circular-progress
      size="tiny"
      active
    ></ha-circular-progress>`;
  }

  const duration =
    new Date(finishEvent.timestamp).getTime() -
    new Date(startEvent.timestamp).getTime();
  const durationString = formatNumber(duration / 1000, hass.locale, {
    maximumFractionDigits: 2,
  });
  return html`${durationString}s ✅`;
};

const renderData = (data: Record<string, any>, keys: Record<string, string>) =>
  Object.entries(keys).map(
    ([key, label]) =>
      html`
        <div class="row">
          <div>${label}</div>
          <div>${data[key]}</div>
        </div>
      `
  );

const dataMinusKeysRender = (
  data: Record<string, any>,
  keys: Record<string, string>
) => {
  const result = {};
  let render = false;
  for (const key in data) {
    if (key in keys) {
      continue;
    }
    render = true;
    result[key] = data[key];
  }
  return render ? html`<pre>${JSON.stringify(result, null, 2)}</pre>` : "";
};

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
                <ha-card>
                  <div class="card-content">
                    <div class="row heading">
                      <div>Run</div>
                      <div>${this._pipelineRun.stage}</div>
                    </div>

                    ${renderData(this._pipelineRun.run, RUN_DATA)}
                    ${this._pipelineRun.error
                      ? renderData(this._pipelineRun.error, ERROR_DATA)
                      : ""}
                  </div>
                </ha-card>

                ${hasStage(this._pipelineRun, "stt")
                  ? html`
                      <ha-card>
                        <div class="card-content">
                          <div class="row heading">
                            <span>Speech-to-Text</span>
                            ${renderProgress(
                              this.hass,
                              this._pipelineRun,
                              "stt"
                            )}
                          </div>
                          ${this._pipelineRun.stt
                            ? html`
                                <div class="card-content">
                                  ${renderData(this._pipelineRun.stt, STT_DATA)}
                                  ${dataMinusKeysRender(
                                    this._pipelineRun.stt,
                                    STT_DATA
                                  )}
                                </div>
                              `
                            : ""}
                        </div>
                      </ha-card>
                    `
                  : ""}
                ${hasStage(this._pipelineRun, "intent")
                  ? html`
                      <ha-card>
                        <div class="card-content">
                          <div class="row heading">
                            <span>Natural Language Processing</span>
                            ${renderProgress(
                              this.hass,
                              this._pipelineRun,
                              "intent"
                            )}
                          </div>
                          ${this._pipelineRun.intent
                            ? html`
                                <div class="card-content">
                                  ${renderData(
                                    this._pipelineRun.intent,
                                    INTENT_DATA
                                  )}
                                  ${dataMinusKeysRender(
                                    this._pipelineRun.intent,
                                    INTENT_DATA
                                  )}
                                </div>
                              `
                            : ""}
                        </div>
                      </ha-card>
                    `
                  : ""}
                ${hasStage(this._pipelineRun, "tts")
                  ? html`
                      <ha-card>
                        <div class="card-content">
                          <div class="row heading">
                            <span>Text-to-Speech</span>
                            ${renderProgress(
                              this.hass,
                              this._pipelineRun,
                              "tts"
                            )}
                          </div>
                          ${this._pipelineRun.tts
                            ? html`
                                <div class="card-content">
                                  ${renderData(this._pipelineRun.tts, TTS_DATA)}
                                  ${dataMinusKeysRender(
                                    this._pipelineRun.tts,
                                    TTS_DATA
                                  )}
                                </div>
                              `
                            : ""}
                        </div>
                      </ha-card>
                    `
                  : ""}
                <ha-card>
                  <ha-expansion-panel>
                    <span slot="header">Raw</span>
                    <pre>${JSON.stringify(this._pipelineRun, null, 2)}</pre>
                  </ha-expansion-panel>
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
        start_stage: "intent",
        end_stage: "intent",
        input: { text: this._newRunInput.value },
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
      .row {
        display: flex;
        justify-content: space-between;
      }
      pre {
        margin: 0;
      }
      ha-expansion-panel {
        padding-left: 8px;
      }
      .heading {
        font-weight: 500;
        margin-bottom: 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-debug": AssistPipelineDebug;
  }
}

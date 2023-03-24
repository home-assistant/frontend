import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-card";
import "../../../../../../components/ha-alert";
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
import { showPromptDialog } from "../../../../../../dialogs/generic/show-dialog-box";

const RUN_DATA = {
  pipeline: "Pipeline",
  language: "Language",
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

const maybeRenderError = (
  run: PipelineRun,
  stage: string,
  lastRunStage: string
) => {
  if (run.stage !== "error" || lastRunStage !== stage) {
    return "";
  }

  return html`<ha-alert alert-type="error">
    ${run.error!.message} (${run.error!.code})
  </ha-alert>`;
};

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

  if (pipelineRun.stage === "error") {
    return html`❌`;
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

  @state() private _pipelineRun?: PipelineRun;

  @state() private _audioContext?: AudioContext;

  private _audioBuffer?: Int16Array[];

  protected render(): TemplateResult {
    const lastRunStage: string = this._pipelineRun
      ? ["tts", "intent", "stt"].find(
          (stage) => this._pipelineRun![stage] !== undefined
        ) || "ready"
      : "ready";

    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="Assist Pipeline"
      >
        <div class="content">
          <div class="start-row">
            <ha-button
              raised
              @click=${this._runTextPipeline}
              .disabled=${this._pipelineRun &&
              !["error", "done"].includes(this._pipelineRun.stage)}
            >
              Run Text Pipeline
            </ha-button>
            <ha-button
              raised
              @click=${this._runAudioPipeline}
              .disabled=${this._pipelineRun &&
              !["error", "done"].includes(this._pipelineRun.stage)}
            >
              Run Audio Pipeline
            </ha-button>
          </div>

          ${this._pipelineRun
            ? html`
                <ha-card>
                  <div class="card-content">
                    <div class="row heading">
                      <div>Run</div>
                      <div>${this._pipelineRun.stage}</div>
                    </div>

                    ${renderData(this._pipelineRun.run, RUN_DATA)}
                  </div>
                </ha-card>

                ${maybeRenderError(this._pipelineRun, "ready", lastRunStage)}
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
                        ${this._pipelineRun.stage === "stt" &&
                        this._audioContext
                          ? html`
                              <div class="card-actions">
                                <ha-button @click=${this._stopRecording}>
                                  Stop Recording
                                </ha-button>
                              </div>
                            `
                          : ""}
                      </ha-card>
                    `
                  : ""}
                ${maybeRenderError(this._pipelineRun, "stt", lastRunStage)}
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
                ${maybeRenderError(this._pipelineRun, "intent", lastRunStage)}
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
                                </div>
                              `
                            : ""}
                        </div>
                        ${this._pipelineRun?.tts?.tts_output
                          ? html`
                              <div class="card-actions">
                                <ha-button @click=${this._playTTS}>
                                  Play Audio
                                </ha-button>
                              </div>
                            `
                          : ""}
                      </ha-card>
                    `
                  : ""}
                ${maybeRenderError(this._pipelineRun, "tts", lastRunStage)}
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

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (
      !changedProperties.has("_pipelineRun") ||
      !this._pipelineRun ||
      this._pipelineRun.init_options.start_stage !== "stt"
    ) {
      return;
    }

    if (this._pipelineRun.stage === "stt" && this._audioBuffer) {
      // Send the buffer over the WS to the STT engine.
      for (const buffer of this._audioBuffer) {
        this._sendAudioChunk(buffer);
      }
      this._audioBuffer = undefined;
    }

    if (this._pipelineRun.stage !== "stt" && this._audioContext) {
      this._audioContext.close();
      this._audioContext = undefined;
      this._audioBuffer = undefined;
    }
  }

  private async _runTextPipeline() {
    const text = await showPromptDialog(this, {
      title: "Input text",
      confirmText: "Run",
    });

    if (!text) {
      return;
    }

    this._pipelineRun = undefined;
    runPipelineFromText(
      this.hass,
      (run) => {
        this._pipelineRun = run;
      },
      {
        start_stage: "intent",
        end_stage: "intent",
        input: { text },
      }
    );
  }

  private async _runAudioPipeline() {
    // @ts-ignore-next-line
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await context.audioWorklet.addModule(
      new URL("./recorder.worklet.js", import.meta.url)
    );

    const source = context.createMediaStreamSource(stream);
    const recorder = new AudioWorkletNode(context, "recorder.worklet");

    this.hass.connection.socket!.binaryType = "arraybuffer";
    this._audioContext = context;
    this._audioBuffer = [];
    source.connect(recorder).connect(context.destination);
    recorder.port.onmessage = (e) => {
      if (this._audioBuffer) {
        this._audioBuffer.push(e.data);
        return;
      }
      if (this._pipelineRun?.stage !== "stt") {
        return;
      }
      this._sendAudioChunk(e.data);
    };

    this._pipelineRun = undefined;
    runPipelineFromText(
      this.hass,
      (run) => {
        this._pipelineRun = run;
      },
      {
        start_stage: "stt",
        end_stage: "tts",
      }
    );
  }

  private _sendAudioChunk(chunk: Int16Array) {
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = this._pipelineRun!.run.runner_data.stt_binary_handler_id!;
    data.set(new Uint8Array(chunk.buffer), 1);

    this.hass.connection.socket!.send(data);
  }

  private _stopRecording(): void {
    this._audioContext!.close();
    this._audioContext = undefined;
    this._audioBuffer = undefined;
    // Send empty message to indicate we're done streaming.
    this._sendAudioChunk(new Int16Array());
  }

  private _playTTS(): void {
    const url = this._pipelineRun!.tts!.tts_output!.url;
    const audio = new Audio(url);
    audio.play();
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
      .start-row {
        text-align: center;
      }
      .start-row ha-button {
        margin: 16px;
      }
      ha-card,
      ha-alert {
        display: block;
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

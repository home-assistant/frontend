import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../../components/ha-card";
import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-circular-progress";
import "../../../../../../components/ha-expansion-panel";
import type { PipelineRun } from "../../../../../../data/voice_assistant";
import type { HomeAssistant } from "../../../../../../types";
import { formatNumber } from "../../../../../../common/number/format_number";

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

  return html`
    <ha-alert alert-type="error">
      ${run.error!.message} (${run.error!.code})
    </ha-alert>
  `;
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
    return html`
      <ha-circular-progress size="tiny" active></ha-circular-progress>
    `;
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
    if (key in keys || key === "done") {
      continue;
    }
    render = true;
    result[key] = data[key];
  }
  return render ? html`<pre>${JSON.stringify(result, null, 2)}</pre>` : "";
};

@customElement("assist-render-pipeline-run")
export class AssistPipelineDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() private pipelineRun!: PipelineRun;

  protected render(): TemplateResult {
    const lastRunStage: string = this.pipelineRun
      ? ["tts", "intent", "stt"].find(
          (stage) => this.pipelineRun![stage] !== undefined
        ) || "ready"
      : "ready";

    const messages: Array<{ from: string; text: string }> = [];

    const userMessage =
      ("text" in this.pipelineRun.init_options.input
        ? this.pipelineRun.init_options.input.text
        : undefined) || this.pipelineRun?.stt?.stt_output?.text;

    if (userMessage) {
      messages.push({
        from: "user",
        text: userMessage,
      });
    }

    if (
      this.pipelineRun?.intent?.intent_output?.response?.speech?.plain?.speech
    ) {
      messages.push({
        from: "hass",
        text: this.pipelineRun.intent.intent_output.response.speech.plain
          .speech,
      });
    }

    return html`
      <ha-card>
        <div class="card-content">
          <div class="row heading">
            <div>Run</div>
            <div>${this.pipelineRun.stage}</div>
          </div>

          ${renderData(this.pipelineRun.run, RUN_DATA)}
          ${messages.length > 0
            ? html`
                <div class="messages">
                  ${messages.map(
                    ({ from, text }) => html`
                      <div class=${`message ${from}`}>${text}</div>
                    `
                  )}
                </div>
                <div style="clear:both"></div>
              `
            : ""}
        </div>
      </ha-card>

      ${maybeRenderError(this.pipelineRun, "ready", lastRunStage)}
      ${hasStage(this.pipelineRun, "stt")
        ? html`
            <ha-card>
              <div class="card-content">
                <div class="row heading">
                  <span>Speech-to-Text</span>
                  ${renderProgress(this.hass, this.pipelineRun, "stt")}
                </div>
                ${this.pipelineRun.stt
                  ? html`
                      <div class="card-content">
                        ${renderData(this.pipelineRun.stt, STT_DATA)}
                        ${dataMinusKeysRender(this.pipelineRun.stt, STT_DATA)}
                      </div>
                    `
                  : ""}
              </div>
            </ha-card>
          `
        : ""}
      ${maybeRenderError(this.pipelineRun, "stt", lastRunStage)}
      ${hasStage(this.pipelineRun, "intent")
        ? html`
            <ha-card>
              <div class="card-content">
                <div class="row heading">
                  <span>Natural Language Processing</span>
                  ${renderProgress(this.hass, this.pipelineRun, "intent")}
                </div>
                ${this.pipelineRun.intent
                  ? html`
                      <div class="card-content">
                        ${renderData(this.pipelineRun.intent, INTENT_DATA)}
                        ${dataMinusKeysRender(
                          this.pipelineRun.intent,
                          INTENT_DATA
                        )}
                      </div>
                    `
                  : ""}
              </div>
            </ha-card>
          `
        : ""}
      ${maybeRenderError(this.pipelineRun, "intent", lastRunStage)}
      ${hasStage(this.pipelineRun, "tts")
        ? html`
            <ha-card>
              <div class="card-content">
                <div class="row heading">
                  <span>Text-to-Speech</span>
                  ${renderProgress(this.hass, this.pipelineRun, "tts")}
                </div>
                ${this.pipelineRun.tts
                  ? html`
                      <div class="card-content">
                        ${renderData(this.pipelineRun.tts, TTS_DATA)}
                      </div>
                    `
                  : ""}
              </div>
              ${this.pipelineRun?.tts?.tts_output
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
      ${maybeRenderError(this.pipelineRun, "tts", lastRunStage)}
      <ha-card>
        <ha-expansion-panel>
          <span slot="header">Raw</span>
          <pre>${JSON.stringify(this.pipelineRun, null, 2)}</pre>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private _playTTS(): void {
    const url = this.pipelineRun!.tts!.tts_output!.url;
    const audio = new Audio(url);
    audio.play();
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-card,
    ha-alert {
      display: block;
      margin-bottom: 16px;
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

    .messages {
      margin-top: 8px;
    }

    .message {
      font-size: 18px;
      margin: 8px 0;
      padding: 8px;
      border-radius: 15px;
      clear: both;
    }

    .message.user {
      margin-left: 24px;
      margin-inline-start: 24px;
      margin-inline-end: initial;
      float: var(--float-end);
      text-align: right;
      border-bottom-right-radius: 0px;
      background-color: var(--light-primary-color);
      color: var(--text-light-primary-color, var(--primary-text-color));
      direction: var(--direction);
    }

    .message.hass {
      margin-right: 24px;
      margin-inline-end: 24px;
      margin-inline-start: initial;
      float: var(--float-start);
      border-bottom-left-radius: 0px;
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-render-pipeline-run": AssistPipelineDebug;
  }
}

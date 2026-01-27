import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { formatNumber } from "../../../../common/number/format_number";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-spinner";
import "../../../../components/ha-yaml-editor";
import type { PipelineRun } from "../../../../data/assist_pipeline";
import type {
  ChatLog,
  ChatLogAssistantContent,
  ChatLogContent,
  ChatLogUserContent,
} from "../../../../data/chat_log";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";

const RUN_DATA = ["pipeline", "language"];
const WAKE_WORD_DATA = ["engine"];

const STT_DATA = ["engine"];

const INTENT_DATA = ["engine", "language", "intent_input"];

const TTS_DATA = ["engine", "language", "voice", "tts_input"];

const STAGES: Record<PipelineRun["stage"], number> = {
  ready: 0,
  wake_word: 1,
  stt: 2,
  intent: 3,
  tts: 4,
  done: 5,
  error: 6,
};

const hasStage = (run: PipelineRun, stage: PipelineRun["stage"]) =>
  run.init_options
    ? STAGES[run.init_options.start_stage] <= STAGES[stage] &&
      STAGES[stage] <= STAGES[run.init_options.end_stage]
    : stage in run;

const maybeRenderError = (
  run: PipelineRun,
  stage: string,
  lastRunStage: string
) => {
  if (!("error" in run) || lastRunStage !== stage) {
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
  stage: PipelineRun["stage"],
  start_suffix = "-start"
) => {
  const startEvent = pipelineRun.events.find(
    (ev) => ev.type === `${stage}` + start_suffix
  );
  const finishEvent = pipelineRun.events.find(
    (ev) => ev.type === `${stage}-end`
  );

  if (!startEvent) {
    return "";
  }

  if (!finishEvent) {
    if ("error" in pipelineRun) {
      return html`❌`;
    }
    return html` <ha-spinner size="small"></ha-spinner> `;
  }

  const duration =
    new Date(finishEvent.timestamp).getTime() -
    new Date(startEvent.timestamp).getTime();
  const durationString = formatNumber(duration / 1000, hass.locale, {
    maximumFractionDigits: 2,
  });
  return html`${durationString}s ✅`;
};

const renderData = (
  hass: HomeAssistant,
  data: Record<string, any>,
  keys: string[]
) =>
  keys.map((key) => {
    const label = hass.localize(
      `ui.panel.config.voice_assistants.debug.stages.${key}` as LocalizeKeys
    );
    return html`
      <div class="row">
        <div>${label}</div>
        <div>${data[key]}</div>
      </div>
    `;
  });

const dataMinusKeysRender = (
  hass: HomeAssistant,
  data: Record<string, any>,
  keys: string[]
) => {
  const result = {};
  let render = false;
  for (const key in data) {
    if (keys.includes(key) || key === "done") {
      continue;
    }
    render = true;
    result[key] = data[key];
  }
  return render
    ? html`<ha-expansion-panel class="yaml-expansion">
        <span slot="header"
          >${hass.localize("ui.panel.config.voice_assistants.debug.raw")}</span
        >
        <ha-yaml-editor
          readOnly
          autoUpdate
          .hass=${hass}
          .value=${result}
        ></ha-yaml-editor>
      </ha-expansion-panel>`
    : "";
};

@customElement("assist-render-pipeline-run")
export class AssistPipelineDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public pipelineRun!: PipelineRun;

  @property({ attribute: false }) public chatLog?: ChatLog;

  private _audioElement?: HTMLAudioElement;

  private get _isPlaying(): boolean {
    return this._audioElement != null && !this._audioElement.paused;
  }

  protected render(): TemplateResult {
    const lastRunStage: string = this.pipelineRun
      ? ["tts", "intent", "stt", "wake_word"].find(
          (stage) => stage in this.pipelineRun
        ) || "ready"
      : "ready";

    let messages: ChatLogContent[];

    if (this.chatLog) {
      messages = this.chatLog.content.filter(
        this.pipelineRun.finished
          ? (content: ChatLogContent) =>
              content.role === "system" ||
              (content.created >= this.pipelineRun.started &&
                content.created <= this.pipelineRun.finished!)
          : (content: ChatLogContent) =>
              content.role === "system" ||
              content.created >= this.pipelineRun.started
      );
    } else {
      messages = [];

      // We don't have the chat log everywhere yet, just fallback for now.
      const userMessage =
        (this.pipelineRun.init_options &&
        "text" in this.pipelineRun.init_options.input
          ? this.pipelineRun.init_options.input.text
          : undefined) ||
        this.pipelineRun?.stt?.stt_output?.text ||
        this.pipelineRun?.intent?.intent_input;

      if (userMessage) {
        messages.push({
          role: "user",
          content: userMessage,
        } as ChatLogUserContent);
      }

      if (
        this.pipelineRun?.intent?.intent_output?.response?.speech?.plain?.speech
      ) {
        messages.push({
          role: "assistant",
          content:
            this.pipelineRun.intent.intent_output.response.speech.plain.speech,
        } as ChatLogAssistantContent);
      }
    }

    return html`
      <ha-card>
        <div class="card-content">
          <div class="row heading">
            <div>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.debug.run"
              )}
            </div>
            <div>${this.pipelineRun.stage}</div>
          </div>

          ${renderData(this.hass, this.pipelineRun.run, RUN_DATA)}
          ${messages.length > 0
            ? html`
                <div class="messages">
                  ${messages.map((content) =>
                    content.role === "system"
                      ? content.content
                        ? html`
                            <ha-expansion-panel
                              class="content-expansion ${content.role}"
                            >
                              <div slot="header">System</div>
                              <pre>${content.content}</pre>
                            </ha-expansion-panel>
                          `
                        : nothing
                      : content.role === "tool_result"
                        ? html`
                            <ha-expansion-panel
                              class="content-expansion ${content.role}"
                            >
                              <div slot="header">
                                Result for ${content.tool_name}
                              </div>
                              <ha-yaml-editor
                                read-only
                                auto-update
                                .hass=${this.hass}
                                .value=${content}
                              ></ha-yaml-editor>
                            </ha-expansion-panel>
                          `
                        : html`
                            ${content.content
                              ? html`
                                  <div class=${`message ${content.role}`}>
                                    ${content.content}
                                  </div>
                                `
                              : nothing}
                            ${content.role === "assistant" &&
                            content.tool_calls?.length
                              ? html`
                                  <ha-expansion-panel
                                    class="content-expansion assistant"
                                  >
                                    <span slot="header">
                                      Call
                                      ${content.tool_calls.length === 1
                                        ? content.tool_calls[0].tool_name
                                        : `${content.tool_calls.length} tools`}
                                    </span>

                                    <ha-yaml-editor
                                      read-only
                                      auto-update
                                      .hass=${this.hass}
                                      .value=${content.tool_calls}
                                    ></ha-yaml-editor>
                                  </ha-expansion-panel>
                                `
                              : nothing}
                          `
                  )}
                </div>
                <div style="clear:both"></div>
              `
            : ""}
        </div>
      </ha-card>

      ${maybeRenderError(this.pipelineRun, "ready", lastRunStage)}
      ${hasStage(this.pipelineRun, "wake_word")
        ? html`
            <ha-card>
              <div class="card-content">
                <div class="row heading">
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.voice_assistants.debug.stages.wake_word"
                    )}</span
                  >
                  ${renderProgress(this.hass, this.pipelineRun, "wake_word")}
                </div>
                ${this.pipelineRun.wake_word
                  ? html`
                      <div class="card-content">
                        ${renderData(
                          this.hass,
                          this.pipelineRun.wake_word,
                          WAKE_WORD_DATA
                        )}
                        ${this.pipelineRun.wake_word.wake_word_output
                          ? html`<div class="row">
                                <div>
                                  ${this.hass.localize(
                                    "ui.panel.config.voice_assistants.debug.stages.model"
                                  )}
                                </div>
                                <div>
                                  ${this.pipelineRun.wake_word.wake_word_output
                                    .ww_id}
                                </div>
                              </div>
                              <div class="row">
                                <div>
                                  ${this.hass.localize(
                                    "ui.panel.config.voice_assistants.debug.stages.timestamp"
                                  )}
                                </div>
                                <div>
                                  ${this.pipelineRun.wake_word.wake_word_output
                                    .timestamp}
                                </div>
                              </div>`
                          : ""}
                        ${dataMinusKeysRender(
                          this.hass,
                          this.pipelineRun.wake_word,
                          WAKE_WORD_DATA
                        )}
                      </div>
                    `
                  : ""}
              </div>
            </ha-card>
          `
        : ""}
      ${maybeRenderError(this.pipelineRun, "wake_word", lastRunStage)}
      ${hasStage(this.pipelineRun, "stt")
        ? html`
            <ha-card>
              <div class="card-content">
                <div class="row heading">
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.voice_assistants.debug.stages.speech_to_text"
                    )}</span
                  >
                  ${renderProgress(
                    this.hass,
                    this.pipelineRun,
                    "stt",
                    "-vad-end"
                  )}
                </div>
                ${this.pipelineRun.stt
                  ? html`
                      <div class="card-content">
                        ${renderData(this.hass, this.pipelineRun.stt, STT_DATA)}
                        <div class="row">
                          <div>
                            ${this.hass.localize(
                              "ui.panel.config.voice_assistants.debug.stages.language"
                            )}
                          </div>
                          <div>${this.pipelineRun.stt.metadata.language}</div>
                        </div>
                        ${this.pipelineRun.stt.stt_output
                          ? html`<div class="row">
                              <div>
                                ${this.hass.localize(
                                  "ui.panel.config.voice_assistants.debug.stages.output"
                                )}
                              </div>
                              <div>${this.pipelineRun.stt.stt_output.text}</div>
                            </div>`
                          : ""}
                        ${dataMinusKeysRender(
                          this.hass,
                          this.pipelineRun.stt,
                          STT_DATA
                        )}
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
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.voice_assistants.debug.stages.natural_language_processing"
                    )}</span
                  >
                  ${renderProgress(this.hass, this.pipelineRun, "intent")}
                </div>
                ${this.pipelineRun.intent
                  ? html`
                      <div class="card-content">
                        ${renderData(
                          this.hass,
                          this.pipelineRun.intent,
                          INTENT_DATA
                        )}
                        ${this.pipelineRun.intent.intent_output
                          ? html`<div class="row">
                                <div>
                                  ${this.hass.localize(
                                    "ui.panel.config.voice_assistants.debug.stages.response_type"
                                  )}
                                </div>
                                <div>
                                  ${this.pipelineRun.intent.intent_output
                                    .response.response_type}
                                </div>
                              </div>
                              ${this.pipelineRun.intent.intent_output.response
                                .response_type === "error"
                                ? html`<div class="row">
                                    <div>
                                      ${this.hass.localize(
                                        "ui.panel.config.voice_assistants.debug.error.code"
                                      )}
                                    </div>
                                    <div>
                                      ${this.pipelineRun.intent.intent_output
                                        .response.data.code}
                                    </div>
                                  </div>`
                                : ""}`
                          : ""}
                        <div class="row">
                          <div>
                            ${this.hass.localize(
                              "ui.panel.config.voice_assistants.debug.stages.prefer_local"
                            )}
                          </div>
                          <div>
                            ${this.pipelineRun.intent.prefer_local_intents}
                          </div>
                        </div>
                        <div class="row">
                          <div>
                            ${this.hass.localize(
                              "ui.panel.config.voice_assistants.debug.stages.processed_locally"
                            )}
                          </div>
                          <div>
                            ${this.pipelineRun.intent.processed_locally}
                          </div>
                        </div>
                        ${dataMinusKeysRender(
                          this.hass,
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
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.voice_assistants.debug.stages.text_to_speech"
                    )}</span
                  >
                  ${renderProgress(this.hass, this.pipelineRun, "tts")}
                </div>
                ${this.pipelineRun.tts
                  ? html`
                      <div class="card-content">
                        ${renderData(this.hass, this.pipelineRun.tts, TTS_DATA)}
                        ${dataMinusKeysRender(
                          this.hass,
                          this.pipelineRun.tts,
                          TTS_DATA
                        )}
                      </div>
                    `
                  : ""}
              </div>
              ${this.pipelineRun?.tts?.tts_output
                ? html`
                    <div class="card-actions">
                      <ha-button
                        .variant=${this._isPlaying ? "danger" : "brand"}
                        @click=${this._isPlaying
                          ? this._stopTTS
                          : this._playTTS}
                      >
                        ${this._isPlaying
                          ? this.hass.localize(
                              "ui.panel.config.voice_assistants.debug.stop_audio"
                            )
                          : this.hass.localize(
                              "ui.panel.config.voice_assistants.debug.play_audio"
                            )}
                      </ha-button>
                    </div>
                  `
                : ""}
            </ha-card>
          `
        : ""}
      ${maybeRenderError(this.pipelineRun, "tts", lastRunStage)}
      <ha-card>
        <ha-expansion-panel class="yaml-expansion">
          <span slot="header"
            >${this.hass.localize(
              "ui.panel.config.voice_assistants.debug.raw"
            )}</span
          >
          <ha-yaml-editor
            read-only
            auto-update
            .hass=${this.hass}
            .value=${this.pipelineRun}
          ></ha-yaml-editor>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private _playTTS(): void {
    // Stop any existing audio first
    this._stopTTS();

    const url = this.pipelineRun!.tts!.tts_output!.url;
    this._audioElement = new Audio(url);

    this._audioElement.addEventListener("error", () => {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.voice_assistants.debug.error.title"
        ),
        text: this.hass.localize(
          "ui.panel.config.voice_assistants.debug.error.playing_audio"
        ),
      });
    });

    this._audioElement.addEventListener("play", () => {
      this.requestUpdate();
    });

    this._audioElement.addEventListener("ended", () => {
      this.requestUpdate();
    });

    this._audioElement.addEventListener("canplaythrough", () => {
      this._audioElement!.play();
    });
  }

  private _stopTTS(): void {
    if (this._audioElement) {
      this._audioElement.pause();
      this._audioElement.currentTime = 0;
      this._audioElement = undefined;
      this.requestUpdate();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopTTS();
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
    .row > div:last-child {
      text-align: right;
    }
    .yaml-expansion {
      padding-left: 8px;
      padding-inline-start: 8px;
      padding-inline-end: initial;
    }
    .card-content .yaml-expansion {
      padding-left: 0px;
      padding-inline-start: 0px;
      padding-inline-end: initial;
      --expansion-panel-summary-padding: 0px;
      --expansion-panel-content-padding: 0px;
    }
    .heading {
      font-weight: var(--ha-font-weight-medium);
      margin-bottom: 16px;
    }

    .messages {
      margin-top: 8px;
    }

    .content-expansion {
      margin: 8px 0;
      border-radius: var(--ha-border-radius-xl);
      clear: both;
      padding: 0 8px;
      --input-fill-color: none;
      max-width: calc(100% - 24px);
      --expansion-panel-summary-padding: 0px;
      --expansion-panel-content-padding: 0px;
    }

    .content-expansion *[slot="header"] {
      font-weight: var(--ha-font-weight-normal);
    }

    .system {
      background-color: var(--success-color);
    }

    .message {
      padding: 8px;
    }

    .message,
    .content-expansion {
      font-size: var(--ha-font-size-l);
      margin: 8px 0;
      border-radius: var(--ha-border-radius-xl);
      clear: both;
    }

    .messages pre {
      white-space: pre-wrap;
    }

    .user,
    .tool_result {
      margin-left: 24px;
      margin-inline-start: 24px;
      margin-inline-end: initial;
      float: var(--float-end);
      border-bottom-right-radius: 0px;
      background-color: var(--light-primary-color);
      color: var(--text-light-primary-color, var(--primary-text-color));
      direction: var(--direction);
      --primary-text-color: var(
        --text-light-primary-color,
        var(--primary-text-color)
      );
    }

    .message.user,
    .content-expansion div[slot="header"] {
      text-align: right;
    }

    .assistant {
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

import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { extractSearchParam } from "../../../../common/url/search-params";
import "../../../../components/ha-assist-pipeline-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import {
  PipelineRun,
  PipelineRunOptions,
  runDebugAssistPipeline,
} from "../../../../data/assist_pipeline";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { AudioRecorder } from "../../../../util/audio-recorder";
import { fileDownload } from "../../../../util/file_download";
import "./assist-render-pipeline-run";

@customElement("assist-pipeline-run-debug")
export class AssistPipelineRunDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _pipelineRuns: PipelineRun[] = [];

  @query("#continue-conversation")
  private _continueConversationCheckbox!: HaCheckbox;

  @query("#continue-conversation-text")
  private _continueConversationTextField?: HaTextField;

  private _audioBuffer?: Int16Array[];

  @state() private _finished = false;

  @state() private _pipelineId?: string =
    extractSearchParam("pipeline") || undefined;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="Assist Pipeline"
      >
        ${this._pipelineRuns.length > 0
          ? html`
              <ha-button
                slot="toolbar-icon"
                @click=${this._clearConversation}
                .disabled=${!this._finished}
              >
                Clear
              </ha-button>
              <ha-button
                slot="toolbar-icon"
                @click=${this._downloadConversation}
              >
                Download
              </ha-button>
            `
          : ""}

        <div class="content">
          <div class="start-row">
            ${this._pipelineRuns.length === 0
              ? html`
                  <ha-assist-pipeline-picker
                    .hass=${this.hass}
                    .value=${this._pipelineId}
                    @value-changed=${this._pipelinePicked}
                  ></ha-assist-pipeline-picker>
                  <div class="start-buttons">
                    <ha-button raised @click=${this._runTextPipeline}>
                      Run Text Pipeline
                    </ha-button>
                    <ha-button
                      raised
                      @click=${this._runAudioPipeline}
                      .disabled=${!window.isSecureContext ||
                      // @ts-ignore-next-line
                      !(window.AudioContext || window.webkitAudioContext)}
                    >
                      Run Audio Pipeline
                    </ha-button>
                    <ha-button
                      raised
                      @click=${this._runAudioWakeWordPipeline}
                      .disabled=${!window.isSecureContext ||
                      // @ts-ignore-next-line
                      !(window.AudioContext || window.webkitAudioContext)}
                    >
                      Run Audio Pipeline with Wake Word detection
                    </ha-button>
                  </div>
                `
              : this._pipelineRuns[0].init_options!.start_stage === "intent"
              ? html`
                  <ha-textfield
                    id="continue-conversation-text"
                    label="Response"
                    .disabled=${!this._finished}
                    @keydown=${this._handleContinueKeyDown}
                  ></ha-textfield>
                  <ha-button
                    @click=${this._runTextPipeline}
                    .disabled=${!this._finished}
                  >
                    Send
                  </ha-button>
                `
              : this._finished
              ? this._pipelineRuns[0].init_options!.start_stage === "wake_word"
                ? html`
                    <ha-button @click=${this._runAudioWakeWordPipeline}>
                      Continue listening for wake word
                    </ha-button>
                  `
                : html`<ha-button @click=${this._runAudioPipeline}>
                    Continue talking
                  </ha-button>`
              : html`
                  <ha-formfield label="Continue conversation">
                    <ha-checkbox
                      id="continue-conversation"
                      checked
                    ></ha-checkbox>
                  </ha-formfield>
                `}
          </div>

          ${this._pipelineRuns.map((run) =>
            run === null
              ? ""
              : html`
                  <assist-render-pipeline-run
                    .hass=${this.hass}
                    .pipelineRun=${run}
                  ></assist-render-pipeline-run>
                `
          )}
        </div>
      </hass-subpage>
    `;
  }

  private get conversationId(): string | null {
    return this._pipelineRuns.length === 0
      ? null
      : this._pipelineRuns[0].intent?.intent_output?.conversation_id || null;
  }

  private async _runTextPipeline() {
    const textfield = this._continueConversationTextField;

    let text: string | null;

    if (textfield) {
      text = textfield.value;
    } else {
      text = await showPromptDialog(this, {
        title: "Input text",
        confirmText: "Run",
      });
    }

    if (!text) {
      return;
    }

    await this._doRunPipeline(
      (run) => {
        if (["done", "error"].includes(run.stage)) {
          this._finished = true;
          if (textfield) {
            textfield.value = "";
          }
        }
      },
      {
        start_stage: "intent",
        end_stage: "intent",
        input: { text },
      }
    );
  }

  private async _runAudioWakeWordPipeline() {
    const audioRecorder = new AudioRecorder((data) => {
      if (this._audioBuffer) {
        this._audioBuffer.push(data);
      } else {
        this._sendAudioChunk(data);
      }
    });

    this._audioBuffer = [];
    await audioRecorder.start();

    let run: PipelineRun | undefined;

    let stopRecording: (() => void) | undefined = () => {
      stopRecording = undefined;
      audioRecorder.close();
      // We're currently STTing, so finish audio
      if (run?.stage === "stt" && run.stt!.done === false) {
        if (this._audioBuffer) {
          for (const chunk of this._audioBuffer) {
            this._sendAudioChunk(chunk);
          }
        }
        // Send empty message to indicate we're done streaming.
        this._sendAudioChunk(new Int16Array());
      }
      this._audioBuffer = undefined;
    };

    await this._doRunPipeline(
      (updatedRun) => {
        run = updatedRun;

        // When we start wake work stage, the WS has a binary handler
        if (updatedRun.stage === "wake_word" && this._audioBuffer) {
          // Send the buffer over the WS to the Wake Word / STT engine.
          for (const buffer of this._audioBuffer) {
            this._sendAudioChunk(buffer);
          }
          this._audioBuffer = undefined;
        }

        // Stop recording if the server is done with STT stage
        if (
          !["ready", "wake_word", "stt"].includes(updatedRun.stage) &&
          stopRecording
        ) {
          stopRecording();
        }

        // Play audio when we're done.
        if (updatedRun.stage === "done") {
          const url = updatedRun.tts!.tts_output!.url;
          const audio = new Audio(url);
          audio.addEventListener("ended", () => {
            if (
              this.isConnected &&
              this._continueConversationCheckbox.checked
            ) {
              this._runAudioWakeWordPipeline();
            } else {
              this._finished = true;
            }
          });
          audio.play();
        } else if (updatedRun.stage === "error") {
          this._finished = true;
        }
      },
      {
        start_stage: "wake_word",
        end_stage: "tts",
        input: {
          sample_rate: audioRecorder.sampleRate!,
        },
      }
    );
  }

  private async _runAudioPipeline() {
    const audioRecorder = new AudioRecorder((data) => {
      if (this._audioBuffer) {
        this._audioBuffer.push(data);
      } else {
        this._sendAudioChunk(data);
      }
    });

    this._audioBuffer = [];
    await audioRecorder.start();

    let run: PipelineRun | undefined;

    let stopRecording: (() => void) | undefined = () => {
      stopRecording = undefined;
      audioRecorder.close();
      // We're currently STTing, so finish audio
      if (run?.stage === "stt" && run.stt!.done === false) {
        if (this._audioBuffer) {
          for (const chunk of this._audioBuffer) {
            this._sendAudioChunk(chunk);
          }
        }
        // Send empty message to indicate we're done streaming.
        this._sendAudioChunk(new Int16Array());
      }
      this._audioBuffer = undefined;
    };

    await this._doRunPipeline(
      (updatedRun) => {
        run = updatedRun;

        // When we start STT stage, the WS has a binary handler
        if (updatedRun.stage === "stt" && this._audioBuffer) {
          // Send the buffer over the WS to the STT engine.
          for (const buffer of this._audioBuffer) {
            this._sendAudioChunk(buffer);
          }
          this._audioBuffer = undefined;
        }

        // Stop recording if the server is done with STT stage
        if (!["ready", "stt"].includes(updatedRun.stage) && stopRecording) {
          stopRecording();
        }

        // Play audio when we're done.
        if (updatedRun.stage === "done") {
          const url = updatedRun.tts!.tts_output!.url;
          const audio = new Audio(url);
          audio.addEventListener("ended", () => {
            if (
              this.isConnected &&
              this._continueConversationCheckbox.checked
            ) {
              this._runAudioPipeline();
            } else {
              this._finished = true;
            }
          });
          audio.play();
        } else if (updatedRun.stage === "error") {
          this._finished = true;
        }
      },
      {
        start_stage: "stt",
        end_stage: "tts",
        input: {
          sample_rate: audioRecorder.sampleRate!,
        },
      }
    );
  }

  private async _doRunPipeline(
    callback: (event: PipelineRun) => void,
    options: PipelineRunOptions
  ) {
    this._finished = false;
    let added = false;
    try {
      await runDebugAssistPipeline(
        this.hass,
        (updatedRun) => {
          if (added) {
            this._pipelineRuns = [updatedRun, ...this._pipelineRuns.slice(1)];
          } else {
            this._pipelineRuns = [updatedRun, ...this._pipelineRuns];
            added = true;
          }
          callback(updatedRun);
        },
        {
          ...options,
          pipeline: this._pipelineId,
          conversation_id: this.conversationId,
        }
      );
    } catch (err: any) {
      await showAlertDialog(this, {
        title: "Error starting pipeline",
        text: err.message || err,
      });
    }
  }

  private _sendAudioChunk(chunk: Int16Array) {
    this.hass.connection.socket!.binaryType = "arraybuffer";
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = this._pipelineRuns[0].run.runner_data.stt_binary_handler_id!;
    data.set(new Uint8Array(chunk.buffer), 1);

    this.hass.connection.socket!.send(data);
  }

  private _handleContinueKeyDown(ev) {
    if (ev.key === "Enter") {
      this._runTextPipeline();
    }
  }

  private _clearConversation() {
    this._pipelineRuns = [];
  }

  private _downloadConversation() {
    fileDownload(
      `data:text/plain;charset=utf-8,${encodeURIComponent(
        JSON.stringify(this._pipelineRuns, null, 2)
      )}`,
      `conversation.json`
    );
  }

  private _pipelinePicked(ev) {
    this._pipelineId = ev.detail.value;
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
      .start-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
      }
      .start-row {
        display: flex;
        justify-content: space-around;
        align-items: center;
        flex-wrap: wrap;
        margin: 0 16px 16px;
      }
      ha-assist-pipeline-picker {
        display: block;
        width: 100%;
        margin-bottom: 16px;
      }
      .start-row ha-textfield {
        flex: 1;
      }
      assist-render-pipeline-run {
        padding-top: 16px;
      }
      assist-render-pipeline-run + assist-render-pipeline-run {
        border-top: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-run-debug": AssistPipelineRunDebug;
  }
}

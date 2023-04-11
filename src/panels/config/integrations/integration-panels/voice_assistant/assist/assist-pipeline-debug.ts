import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../../../../components/ha-button";
import {
  PipelineRun,
  PipelineRunOptions,
  runVoiceAssistantPipeline,
} from "../../../../../../data/voice_assistant";
import "../../../../../../layouts/hass-subpage";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-checkbox";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../../../../dialogs/generic/show-dialog-box";
import "./assist-render-pipeline-run";
import type { HaCheckbox } from "../../../../../../components/ha-checkbox";
import type { HaTextField } from "../../../../../../components/ha-textfield";
import "../../../../../../components/ha-textfield";
import { fileDownload } from "../../../../../../util/file_download";

@customElement("assist-pipeline-debug")
export class AssistPipelineDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _pipelineRuns: PipelineRun[] = [];

  @query("#continue-conversation")
  private _continueConversationCheckbox!: HaCheckbox;

  @query("#continue-conversation-text")
  private _continueConversationTextField?: HaTextField;

  private _audioBuffer?: Int16Array[];

  @state() private _finished = false;

  @state() private _languageOverride?: string;

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
          : html`
              <ha-button slot="toolbar-icon" @click=${this._setLanguage}>
                Set Language
              </ha-button>
            `}

        <div class="content">
          <div class="start-row">
            ${this._pipelineRuns.length === 0
              ? html`
                  <ha-button raised @click=${this._runTextPipeline}>
                    Run Text Pipeline
                  </ha-button>
                  <ha-button raised @click=${this._runAudioPipeline}>
                    Run Audio Pipeline
                  </ha-button>
                `
              : this._pipelineRuns[0].init_options.start_stage === "intent"
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
              ? html`
                  <ha-button @click=${this._runAudioPipeline}>
                    Continue talking
                  </ha-button>
                `
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

  private async _runAudioPipeline() {
    // @ts-ignore-next-line
    const context = new (window.AudioContext || window.webkitAudioContext)();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      return;
    }

    await context.audioWorklet.addModule(
      new URL("./recorder.worklet.js", import.meta.url)
    );

    const source = context.createMediaStreamSource(stream);
    const recorder = new AudioWorkletNode(context, "recorder.worklet");

    this.hass.connection.socket!.binaryType = "arraybuffer";

    let run: PipelineRun | undefined;

    let stopRecording: (() => void) | undefined = () => {
      stopRecording = undefined;
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
      stream.getTracks()[0].stop();
      context.close();
    };
    this._audioBuffer = [];
    source.connect(recorder).connect(context.destination);
    recorder.port.onmessage = (e) => {
      if (!stopRecording) {
        return;
      }
      if (this._audioBuffer) {
        this._audioBuffer.push(e.data);
      } else {
        this._sendAudioChunk(e.data);
      }
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
            if (this._continueConversationCheckbox.checked) {
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
          sample_rate: context.sampleRate,
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
      await runVoiceAssistantPipeline(
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
          language: this._languageOverride,
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
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = this._pipelineRuns[0].run.runner_data.stt_binary_handler_id!;
    data.set(new Uint8Array(chunk.buffer), 1);

    this.hass.connection.socket!.send(data);
  }

  private _handleContinueKeyDown(ev) {
    if (ev.keyCode === 13) {
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

  private async _setLanguage() {
    const language = await showPromptDialog(this, {
      title: "Language override",
      inputLabel: "Language",
      inputType: "text",
      confirmText: "Set",
    });
    if (language) {
      this._languageOverride = language;
    }
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
        display: flex;
        justify-content: space-around;
        align-items: center;
        margin: 0 16px 16px;
      }
      .start-row ha-textfield {
        flex: 1;
      }
      assist-render-pipeline-run {
        padding-top: 16px;
      }
      assist-render-pipeline-run + assist-render-pipeline-run {
        border-top: 3px solid black;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-debug": AssistPipelineDebug;
  }
}

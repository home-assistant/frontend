import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../../../../components/ha-button";
import {
  PipelineRun,
  runPipelineFromText,
} from "../../../../../../data/voice_assistant";
import "../../../../../../layouts/hass-subpage";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-checkbox";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";
import { showPromptDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import "./assist-render-pipeline-run";
import type { HaCheckbox } from "../../../../../../components/ha-checkbox";
import type { HaTextField } from "../../../../../../components/ha-textfield";
import "../../../../../../components/ha-textfield";

@customElement("assist-pipeline-debug")
export class AssistPipelineDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _pipelineRuns: PipelineRun[] = [];

  @state() private _stopRecording?: () => void;

  @query("#continue-conversation")
  private _continueConversationCheckbox!: HaCheckbox;

  @query("#continue-conversation-text")
  private _continueConversationTextField?: HaTextField;

  private _audioBuffer?: Int16Array[];

  @state() private _finished = false;

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
            `
          : ""}

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

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (
      !changedProperties.has("_pipelineRuns") ||
      this._pipelineRuns.length === 0
    ) {
      return;
    }

    const currentRun = this._pipelineRuns[0];

    if (currentRun.init_options.start_stage !== "stt") {
      if (["error", "done"].includes(currentRun.stage)) {
        this._finished = true;
      }
      return;
    }

    if (currentRun.stage === "stt" && this._audioBuffer) {
      // Send the buffer over the WS to the STT engine.
      for (const buffer of this._audioBuffer) {
        this._sendAudioChunk(buffer);
      }
      this._audioBuffer = undefined;
    }

    if (currentRun.stage !== "stt" && this._stopRecording) {
      this._stopRecording();
    }

    if (currentRun.stage === "done") {
      const url = currentRun.tts!.tts_output!.url;
      const audio = new Audio(url);
      audio.addEventListener("ended", () => {
        if (this._continueConversationCheckbox.checked) {
          this._runAudioPipeline();
        } else {
          this._finished = true;
        }
      });
      audio.play();
    } else if (currentRun.stage === "error") {
      this._finished = true;
    }
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

    let added = false;
    runPipelineFromText(
      this.hass,
      (run) => {
        if (textfield && ["done", "error"].includes(run.stage)) {
          textfield.value = "";
        }

        if (added) {
          this._pipelineRuns = [run, ...this._pipelineRuns.slice(1)];
        } else {
          this._pipelineRuns = [run, ...this._pipelineRuns];
          added = true;
        }
      },
      {
        start_stage: "intent",
        end_stage: "intent",
        input: { text },
        conversation_id: this.conversationId,
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
    this._stopRecording = () => {
      stream.getTracks()[0].stop();
      context.close();
      this._stopRecording = undefined;
      this._audioBuffer = undefined;
      // Send empty message to indicate we're done streaming.
      this._sendAudioChunk(new Int16Array());
    };
    this._audioBuffer = [];
    source.connect(recorder).connect(context.destination);
    recorder.port.onmessage = (e) => {
      if (this._audioBuffer) {
        this._audioBuffer.push(e.data);
        return;
      }
      if (this._pipelineRuns[0].stage !== "stt") {
        return;
      }
      this._sendAudioChunk(e.data);
    };

    this._finished = false;
    let added = false;
    runPipelineFromText(
      this.hass,
      (run) => {
        if (added) {
          this._pipelineRuns = [run, ...this._pipelineRuns.slice(1)];
        } else {
          this._pipelineRuns = [run, ...this._pipelineRuns];
          added = true;
        }
      },
      {
        start_stage: "stt",
        end_stage: "tts",
        conversation_id: this.conversationId,
      }
    );
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

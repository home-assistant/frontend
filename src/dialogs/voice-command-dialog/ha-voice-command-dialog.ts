import "@material/mwc-button/mwc-button";
import {
  mdiAlertCircle,
  mdiChevronDown,
  mdiClose,
  mdiHelpCircleOutline,
  mdiMicrophone,
  mdiSend,
  mdiStar,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-button";
import "../../components/ha-button-menu";
import "../../components/ha-dialog";
import "../../components/ha-dialog-header";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/ha-textfield";
import type { HaTextField } from "../../components/ha-textfield";
import {
  AssistPipeline,
  getAssistPipeline,
  listAssistPipelines,
  runAssistPipeline,
} from "../../data/assist_pipeline";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { AudioRecorder } from "../../util/audio-recorder";
import { documentationUrl } from "../../util/documentation-url";
import { showAlertDialog } from "../generic/show-dialog-box";
import { VoiceCommandDialogParams } from "./show-ha-voice-command-dialog";

interface Message {
  who: string;
  text?: string | TemplateResult;
  error?: boolean;
}

@customElement("ha-voice-command-dialog")
export class HaVoiceCommandDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _conversation?: Message[];

  @state() private _opened = false;

  @storage({
    key: "AssistPipelineId",
    state: true,
    subscribe: false,
  })
  private _pipelineId?: string;

  @state() private _pipeline?: AssistPipeline;

  @state() private _showSendButton = false;

  @state() private _pipelines?: AssistPipeline[];

  @state() private _preferredPipeline?: string;

  @query("#scroll-container") private _scrollContainer!: HTMLDivElement;

  @query("#message-input") private _messageInput!: HaTextField;

  private _conversationId: string | null = null;

  private _audioRecorder?: AudioRecorder;

  private _audioBuffer?: Int16Array[];

  private _audio?: HTMLAudioElement;

  private _stt_binary_handler_id?: number | null;

  private _pipelinePromise?: Promise<AssistPipeline>;

  public async showDialog(
    params: Required<VoiceCommandDialogParams>
  ): Promise<void> {
    if (params.pipeline_id === "last_used") {
      // Do not set pipeline id (retrieve from storage)
    } else if (params.pipeline_id === "preferred") {
      await this._loadPipelines();
      this._pipelineId = this._preferredPipeline;
    } else {
      this._pipelineId = params.pipeline_id;
    }

    this._conversation = [
      {
        who: "hass",
        text: this.hass.localize("ui.dialogs.voice_command.how_can_i_help"),
      },
    ];
    this._opened = true;
    await this.updateComplete;
    this._scrollMessagesBottom();

    await this._pipelinePromise;
    if (
      params?.start_listening &&
      this._pipeline?.stt_engine &&
      AudioRecorder.isSupported
    ) {
      this._toggleListening();
    }
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    this._pipeline = undefined;
    this._pipelines = undefined;
    this._conversation = undefined;
    this._conversationId = null;
    this._audioRecorder?.close();
    this._audioRecorder = undefined;
    this._audio?.pause();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    const supportsMicrophone = AudioRecorder.isSupported;
    const supportsSTT = this._pipeline?.stt_engine;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.dialogs.voice_command.title")}
        flexContent
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <div slot="title">
            ${this.hass.localize("ui.dialogs.voice_command.title")}
            <ha-button-menu
              @opened=${this._loadPipelines}
              @closed=${stopPropagation}
              activatable
              fixed
            >
              <ha-button slot="trigger">
                ${this._pipeline?.name}
                <ha-svg-icon
                  slot="trailingIcon"
                  .path=${mdiChevronDown}
                ></ha-svg-icon>
              </ha-button>
              ${this._pipelines?.map(
                (pipeline) =>
                  html`<ha-list-item
                    ?selected=${pipeline.id === this._pipelineId ||
                    (!this._pipelineId &&
                      pipeline.id === this._preferredPipeline)}
                    .pipeline=${pipeline.id}
                    @click=${this._selectPipeline}
                    .hasMeta=${pipeline.id === this._preferredPipeline}
                  >
                    ${pipeline.name}${pipeline.id === this._preferredPipeline
                      ? html`
                          <ha-svg-icon
                            slot="meta"
                            .path=${mdiStar}
                          ></ha-svg-icon>
                        `
                      : nothing}
                  </ha-list-item>`
              )}
              ${this.hass.user?.is_admin
                ? html`<li divider role="separator"></li>
                    <a href="/config/voice-assistants/assistants"
                      ><ha-list-item @click=${this.closeDialog}
                        >${this.hass.localize(
                          "ui.dialogs.voice_command.manage_assistants"
                        )}</ha-list-item
                      ></a
                    >`
                : nothing}
            </ha-button-menu>
          </div>
          <a
            href=${documentationUrl(this.hass, "/docs/assist/")}
            slot="actionItems"
            target="_blank"
            rel="noopener noreferer"
          >
            <ha-icon-button
              .label=${this.hass.localize("ui.common.help")}
              .path=${mdiHelpCircleOutline}
            ></ha-icon-button>
          </a>
        </ha-dialog-header>
        <div class="messages">
          <div class="messages-container" id="scroll-container">
            ${this._conversation!.map(
              (message) => html`
                <div class=${this._computeMessageClasses(message)}>
                  ${message.text}
                </div>
              `
            )}
          </div>
        </div>
        <div class="input" slot="primaryAction">
          <ha-textfield
            id="message-input"
            @keyup=${this._handleKeyUp}
            @input=${this._handleInput}
            .label=${this.hass.localize(`ui.dialogs.voice_command.input_label`)}
            dialogInitialFocus
            iconTrailing
          >
            <span slot="trailingIcon">
              ${this._showSendButton || !supportsSTT
                ? html`
                    <ha-icon-button
                      class="listening-icon"
                      .path=${mdiSend}
                      @click=${this._handleSendMessage}
                      .label=${this.hass.localize(
                        "ui.dialogs.voice_command.send_text"
                      )}
                    >
                    </ha-icon-button>
                  `
                : html`
                    ${this._audioRecorder?.active
                      ? html`
                          <div class="bouncer">
                            <div class="double-bounce1"></div>
                            <div class="double-bounce2"></div>
                          </div>
                        `
                      : nothing}

                    <div class="listening-icon">
                      <ha-icon-button
                        .path=${mdiMicrophone}
                        @click=${this._handleListeningButton}
                        .label=${this.hass.localize(
                          "ui.dialogs.voice_command.start_listening"
                        )}
                      >
                      </ha-icon-button>
                      ${!supportsMicrophone
                        ? html`
                            <ha-svg-icon
                              .path=${mdiAlertCircle}
                              class="unsupported"
                            ></ha-svg-icon>
                          `
                        : null}
                    </div>
                  `}
            </span>
          </ha-textfield>
        </div>
      </ha-dialog>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      changedProperties.has("_pipelineId") ||
      (changedProperties.has("_opened") && this._opened === true)
    ) {
      this._getPipeline();
    }
  }

  private async _getPipeline() {
    try {
      this._pipelinePromise = getAssistPipeline(this.hass, this._pipelineId);
      this._pipeline = await this._pipelinePromise;
    } catch (e: any) {
      if (e.code === "not_found") {
        this._pipelineId = undefined;
      }
    }
  }

  private async _loadPipelines() {
    if (this._pipelines) {
      return;
    }
    const { pipelines, preferred_pipeline } = await listAssistPipelines(
      this.hass
    );
    this._pipelines = pipelines;
    this._preferredPipeline = preferred_pipeline || undefined;
  }

  private async _selectPipeline(ev: CustomEvent) {
    this._pipelineId = (ev.currentTarget as any).pipeline;
    this._conversation = [
      {
        who: "hass",
        text: this.hass.localize("ui.dialogs.voice_command.how_can_i_help"),
      },
    ];
    await this.updateComplete;
    this._scrollMessagesBottom();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_conversation") || changedProps.has("results")) {
      this._scrollMessagesBottom();
    }
  }

  private _addMessage(message: Message) {
    this._conversation = [...this._conversation!, message];
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    const input = ev.target as HaTextField;
    if (ev.key === "Enter" && input.value) {
      this._processText(input.value);
      input.value = "";
      this._showSendButton = false;
    }
  }

  private _handleInput(ev: InputEvent) {
    const value = (ev.target as HaTextField).value;
    if (value && !this._showSendButton) {
      this._showSendButton = true;
    } else if (!value && this._showSendButton) {
      this._showSendButton = false;
    }
  }

  private _handleSendMessage() {
    if (this._messageInput.value) {
      this._processText(this._messageInput.value);
      this._messageInput.value = "";
      this._showSendButton = false;
    }
  }

  private async _processText(text: string) {
    this._audio?.pause();
    this._addMessage({ who: "user", text });
    const message: Message = {
      who: "hass",
      text: "…",
    };
    // To make sure the answer is placed at the right user text, we add it before we process it
    this._addMessage(message);
    try {
      const unsub = await runAssistPipeline(
        this.hass,
        (event) => {
          if (event.type === "intent-end") {
            this._conversationId = event.data.intent_output.conversation_id;
            const plain = event.data.intent_output.response.speech?.plain;
            if (plain) {
              message.text = plain.speech;
            }
            this.requestUpdate("_conversation");
            unsub();
          }
          if (event.type === "error") {
            message.text = event.data.message;
            message.error = true;
            this.requestUpdate("_conversation");
            unsub();
          }
        },
        {
          start_stage: "intent",
          input: { text },
          end_stage: "intent",
          pipeline: this._pipelineId,
          conversation_id: this._conversationId,
        }
      );
    } catch {
      message.text = this.hass.localize("ui.dialogs.voice_command.error");
      message.error = true;
      this.requestUpdate("_conversation");
    }
  }

  private _handleListeningButton(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    this._toggleListening();
  }

  private _toggleListening() {
    const supportsMicrophone = AudioRecorder.isSupported;
    if (!supportsMicrophone) {
      this._showNotSupportedMessage();
      return;
    }
    if (!this._audioRecorder?.active) {
      this._startListening();
    } else {
      this._stopListening();
    }
  }

  private async _showNotSupportedMessage() {
    this._addMessage({
      who: "hass",
      text: html`
        <p>
          ${this.hass.localize(
            "ui.dialogs.voice_command.not_supported_microphone_browser"
          )}
        </p>
        <p>
          ${this.hass.localize(
            "ui.dialogs.voice_command.not_supported_microphone_documentation",
            {
              documentation_link: html`
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href=${documentationUrl(
                    this.hass,
                    "/docs/configuration/securing/#remote-access"
                  )}
                >
                  ${this.hass.localize(
                    "ui.dialogs.voice_command.not_supported_microphone_documentation_link"
                  )}
                </a>
              `,
            }
          )}
        </p>
      `,
    });
  }

  private async _startListening() {
    this._audio?.pause();
    if (!this._audioRecorder) {
      this._audioRecorder = new AudioRecorder((audio) => {
        if (this._audioBuffer) {
          this._audioBuffer.push(audio);
        } else {
          this._sendAudioChunk(audio);
        }
      });
    }
    this._stt_binary_handler_id = undefined;
    this._audioBuffer = [];
    const userMessage: Message = {
      who: "user",
      text: "…",
    };
    this._audioRecorder.start().then(() => {
      this._addMessage(userMessage);
      this.requestUpdate("_audioRecorder");
    });
    const hassMessage: Message = {
      who: "hass",
      text: "…",
    };
    // To make sure the answer is placed at the right user text, we add it before we process it
    try {
      const unsub = await runAssistPipeline(
        this.hass,
        (event) => {
          if (event.type === "run-start") {
            this._stt_binary_handler_id =
              event.data.runner_data.stt_binary_handler_id;
          }

          // When we start STT stage, the WS has a binary handler
          if (event.type === "stt-start" && this._audioBuffer) {
            // Send the buffer over the WS to the STT engine.
            for (const buffer of this._audioBuffer) {
              this._sendAudioChunk(buffer);
            }
            this._audioBuffer = undefined;
          }

          // Stop recording if the server is done with STT stage
          if (event.type === "stt-end") {
            this._stt_binary_handler_id = undefined;
            this._stopListening();
            userMessage.text = event.data.stt_output.text;
            this.requestUpdate("_conversation");
            // To make sure the answer is placed at the right user text, we add it before we process it
            this._addMessage(hassMessage);
          }

          if (event.type === "intent-end") {
            this._conversationId = event.data.intent_output.conversation_id;
            const plain = event.data.intent_output.response.speech?.plain;
            if (plain) {
              hassMessage.text = plain.speech;
            }
            this.requestUpdate("_conversation");
          }

          if (event.type === "tts-end") {
            const url = event.data.tts_output.url;
            this._audio = new Audio(url);
            this._audio.play();
            this._audio.addEventListener("ended", this._unloadAudio);
            this._audio.addEventListener("pause", this._unloadAudio);
            this._audio.addEventListener("canplaythrough", this._playAudio);
            this._audio.addEventListener("error", this._audioError);
          }

          if (event.type === "run-end") {
            this._stt_binary_handler_id = undefined;
            unsub();
          }

          if (event.type === "error") {
            this._stt_binary_handler_id = undefined;
            if (userMessage.text === "…") {
              userMessage.text = event.data.message;
              userMessage.error = true;
            } else {
              hassMessage.text = event.data.message;
              hassMessage.error = true;
            }
            this._stopListening();
            this.requestUpdate("_conversation");
            unsub();
          }
        },
        {
          start_stage: "stt",
          end_stage: this._pipeline?.tts_engine ? "tts" : "intent",
          input: { sample_rate: this._audioRecorder.sampleRate! },
          pipeline: this._pipelineId,
          conversation_id: this._conversationId,
        }
      );
    } catch (err: any) {
      await showAlertDialog(this, {
        title: "Error starting pipeline",
        text: err.message || err,
      });
      this._stopListening();
    }
  }

  private _stopListening() {
    this._audioRecorder?.stop();
    this.requestUpdate("_audioRecorder");
    // We're currently STTing, so finish audio
    if (this._stt_binary_handler_id) {
      if (this._audioBuffer) {
        for (const chunk of this._audioBuffer) {
          this._sendAudioChunk(chunk);
        }
      }
      // Send empty message to indicate we're done streaming.
      this._sendAudioChunk(new Int16Array());
      this._stt_binary_handler_id = undefined;
    }
    this._audioBuffer = undefined;
  }

  private _sendAudioChunk(chunk: Int16Array) {
    this.hass.connection.socket!.binaryType = "arraybuffer";

    // eslint-disable-next-line eqeqeq
    if (this._stt_binary_handler_id == undefined) {
      return;
    }
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = this._stt_binary_handler_id;
    data.set(new Uint8Array(chunk.buffer), 1);

    this.hass.connection.socket!.send(data);
  }

  private _playAudio = () => {
    this._audio?.play();
  };

  private _audioError = () => {
    showAlertDialog(this, { title: "Error playing audio." });
    this._audio?.removeAttribute("src");
  };

  private _unloadAudio = () => {
    this._audio?.removeAttribute("src");
    this._audio = undefined;
  };

  private _scrollMessagesBottom() {
    const scrollContainer = this._scrollContainer;
    if (!scrollContainer) {
      return;
    }
    scrollContainer.scrollTo(0, 99999);
  }

  private _computeMessageClasses(message: Message) {
    return `message ${message.who} ${message.error ? " error" : ""}`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .listening-icon {
          position: relative;
          color: var(--secondary-text-color);
          margin-right: -24px;
          margin-inline-end: -24px;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        .listening-icon[active] {
          color: var(--primary-color);
        }

        .unsupported {
          color: var(--error-color);
          position: absolute;
          --mdc-icon-size: 16px;
          right: 5px;
          top: 0px;
        }

        ha-dialog {
          --primary-action-button-flex: 1;
          --secondary-action-button-flex: 0;
          --mdc-dialog-max-width: 500px;
          --mdc-dialog-max-height: 500px;
          --dialog-content-padding: 0;
        }
        ha-dialog-header a {
          color: var(--primary-text-color);
        }
        div[slot="title"] {
          display: flex;
          flex-direction: column;
          margin: -4px 0;
        }
        ha-button-menu {
          --mdc-theme-on-primary: var(--text-primary-color);
          --mdc-theme-primary: var(--primary-color);
          margin: -8px 0 0 -8px;
        }
        ha-button-menu ha-button {
          --mdc-theme-primary: var(--secondary-text-color);
          --mdc-typography-button-text-transform: none;
          --mdc-typography-button-font-size: unset;
          --mdc-typography-button-font-weight: 400;
          --mdc-typography-button-letter-spacing: var(
            --mdc-typography-headline6-letter-spacing,
            0.0125em
          );
          --mdc-typography-button-line-height: var(
            --mdc-typography-headline6-line-height,
            2rem
          );
          --button-height: auto;
        }
        ha-button-menu ha-button ha-svg-icon {
          height: 28px;
          margin-left: 4px;
          margin-inline-start: 4px;
          margin-inline-end: 4px;
          direction: var(--direction);
        }
        ha-list-item {
          --mdc-list-item-meta-size: 16px;
        }
        ha-list-item ha-svg-icon {
          margin-left: 4px;
          margin-inline-start: 4px;
          margin-inline-end: 4px;
          direction: var(--direction);
          display: block;
        }
        ha-button-menu a {
          text-decoration: none;
        }
        ha-textfield {
          display: block;
          overflow: hidden;
        }
        a.button {
          text-decoration: none;
        }
        a.button > mwc-button {
          width: 100%;
        }
        .side-by-side {
          display: flex;
          margin: 8px 0;
        }
        .side-by-side > * {
          flex: 1 0;
          padding: 4px;
        }
        .messages {
          display: block;
          height: 400px;
          box-sizing: border-box;
          position: relative;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-max-width: 100%;
          }
          .messages {
            height: 100%;
            flex: 1;
          }
        }
        .messages-container {
          position: absolute;
          bottom: 0px;
          right: 0px;
          left: 0px;
          padding: 24px;
          box-sizing: border-box;
          overflow-y: auto;
          max-height: 100%;
        }
        .message {
          font-size: 18px;
          clear: both;
          margin: 8px 0;
          padding: 8px;
          border-radius: 15px;
        }
        .message p {
          margin: 0;
        }
        .message p:not(:last-child) {
          margin-bottom: 8px;
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

        .message a {
          color: var(--text-primary-color);
        }

        .message img {
          width: 100%;
          border-radius: 10px;
        }

        .message.error {
          background-color: var(--error-color);
          color: var(--text-primary-color);
        }

        .input {
          margin-left: 0;
          margin-right: 0;
        }

        .bouncer {
          width: 48px;
          height: 48px;
          position: absolute;
        }
        .double-bounce1,
        .double-bounce2 {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--primary-color);
          opacity: 0.2;
          position: absolute;
          top: 0;
          left: 0;
          -webkit-animation: sk-bounce 2s infinite ease-in-out;
          animation: sk-bounce 2s infinite ease-in-out;
        }
        .double-bounce2 {
          -webkit-animation-delay: -1s;
          animation-delay: -1s;
        }
        @-webkit-keyframes sk-bounce {
          0%,
          100% {
            -webkit-transform: scale(0);
          }
          50% {
            -webkit-transform: scale(1);
          }
        }
        @keyframes sk-bounce {
          0%,
          100% {
            transform: scale(0);
            -webkit-transform: scale(0);
          }
          50% {
            transform: scale(1);
            -webkit-transform: scale(1);
          }
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          .message {
            font-size: 16px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-command-dialog": HaVoiceCommandDialog;
  }
}
